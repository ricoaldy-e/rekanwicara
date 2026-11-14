"""Team-only tutorial production; fixed paths, no analysis or dataset access."""

import json
import math
import shutil
import subprocess
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Annotated, Literal
from urllib.parse import urlsplit
from uuid import UUID

import httpx
from fastapi import APIRouter, File, Header, UploadFile

from app.api.deps import SettingsDep, ThresholdsDep
from app.api.errors import ApiError
from app.api.schemas import (
    TutorialItem,
    TutorialPresence,
    TutorialsResponse,
    TutorialUploadResponse,
)
from app.api.uploads import check_video_upload
from app.api.v1.prefix import API_PREFIX
from app.core.settings import Settings
from app.core.thresholds import TutorialsConfig
from app.pipeline.media import MediaToolsMissing, find_tools

router = APIRouter(prefix=API_PREFIX, tags=["tutorials"])
MANIFEST_PATH = Path(__file__).resolve().parents[2] / "content" / "tutorials.json"
BUCKET = "rekan-wicara-tutorials"


def catalogue(
    group: Literal["important_words", "level_1"] = "important_words",
) -> list[TutorialItem]:
    path = (
        MANIFEST_PATH
        if group == "important_words"
        else MANIFEST_PATH.with_name("level_one_tutorials.json")
    )
    return [TutorialItem.model_validate(item) for item in json.loads(path.read_text("utf-8"))]


@contextmanager
def storage_client(settings: Settings, authorization: str | None) -> Iterator[httpx.Client]:
    parts = (authorization or "").split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise ApiError(401, "auth_required", "Login akun pendamping diperlukan.")
    base = settings.supabase_url.rstrip("/")
    origin = urlsplit(base)
    key = settings.supabase_service_role_key.get_secret_value()
    if origin.scheme != "https" or not origin.netloc or origin.username or origin.query or not key:
        raise ApiError(
            503, "tutorial_not_configured", "Layanan upload tutorial belum dikonfigurasi."
        )
    try:
        with httpx.Client(
            base_url=base,
            timeout=60,
            follow_redirects=False,
            trust_env=False,
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
        ) as client:
            auth = client.get(
                "/auth/v1/user", headers={"Authorization": f"Bearer {parts[1]}"}, timeout=10
            )
            if auth.status_code in (401, 403):
                raise ApiError(401, "auth_invalid", "Sesi berakhir. Silakan login kembali.")
            if auth.status_code != 200:
                raise ApiError(503, "auth_unavailable", "Sesi belum dapat diverifikasi.")
            user = auth.json()
            if (
                user.get("is_anonymous") is not False
                or not user.get("email")
                or UUID(user["id"]) not in settings.tutorial_uploader_ids
            ):
                raise ApiError(
                    403, "tutorial_forbidden", "Akun ini belum diizinkan merekam tutorial tim."
                )
            yield client
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        raise ApiError(
            503, "tutorial_unavailable", "Storage belum dapat dihubungi. Coba lagi."
        ) from exc


def stored_paths(client: httpx.Client, items: list[TutorialItem] | None = None) -> set[str]:
    paths: set[str] = set()
    prefixes = sorted(
        {item.storage_path.rsplit("/", 1)[0] for item in (catalogue() if items is None else items)}
    )
    for prefix in prefixes:
        response = client.post(
            f"/storage/v1/object/list/{BUCKET}",
            json={
                "prefix": prefix + "/",
                "limit": 100,
                "offset": 0,
                "sortBy": {"column": "name", "order": "asc"},
            },
        )
        if response.status_code != 200 or not isinstance(response.json(), list):
            raise ApiError(503, "tutorial_unavailable", "Daftar video belum dapat diperiksa.")
        paths.update(
            f"{prefix}/{obj['name']}"
            for obj in response.json()
            if obj.get("id") and obj.get("metadata", {}).get("size", 0) > 0
        )
    return paths


@router.get("/tutorials", response_model=TutorialsResponse)
def list_tutorials(
    settings: SettingsDep,
    thresholds: ThresholdsDep,
    authorization: Annotated[str | None, Header()] = None,
    group: Literal["important_words", "level_1"] = "important_words",
) -> TutorialsResponse:
    items = catalogue(group)
    with storage_client(settings, authorization) as client:
        paths = stored_paths(client, items)
    return TutorialsResponse(
        items=[
            TutorialPresence(**item.model_dump(), present=item.storage_path in paths)
            for item in items
        ],
        max_duration_s=thresholds.tutorials.max_duration_s,
        max_upload_mb=thresholds.tutorials.max_upload_mb,
    )


def convert_video(source: Path, destination: Path, config: TutorialsConfig) -> None:
    try:
        ffmpeg, ffprobe = find_tools()
        probe = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-protocol_whitelist",
                "file,pipe",
                "-show_entries",
                "format=duration:stream=codec_type,duration",
                "-of",
                "json",
                str(source),
            ],
            capture_output=True,
            timeout=config.processing_timeout_s,
            check=True,
        )
        info = json.loads(probe.stdout)
        streams = info.get("streams", [])
        if not {"video", "audio"}.issubset({s.get("codec_type") for s in streams}):
            raise ApiError(
                422, "tutorial_audio_video_required", "Video harus memiliki gambar dan suara."
            )
        durations = [float(info["format"]["duration"])]
        durations.extend(
            float(s["duration"]) for s in streams if s.get("duration") not in (None, "N/A")
        )
        if any(not math.isfinite(d) or d <= 0 or d > config.max_duration_s for d in durations):
            raise ApiError(
                422, "tutorial_duration", "Durasi video melewati batas. Rekam ulang lebih singkat."
            )
        # Preserve the complete demonstration; convert iOS MOV/HEVC to playable H.264/AAC MP4.
        subprocess.run(
            [
                ffmpeg,
                "-nostdin",
                "-v",
                "error",
                "-protocol_whitelist",
                "file,pipe",
                "-i",
                str(source),
                "-map",
                "0:v:0",
                "-map",
                "0:a:0",
                "-map_metadata",
                "-1",
                "-vf",
                "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "18",
                "-pix_fmt",
                "yuv420p",
                "-r",
                "30",
                "-c:a",
                "aac",
                "-movflags",
                "+faststart",
                str(destination),
            ],
            capture_output=True,
            timeout=config.processing_timeout_s,
            check=True,
        )
    except MediaToolsMissing as exc:
        raise ApiError(
            503, "media_tools_missing", "FFmpeg dan ffprobe belum tersedia di server."
        ) from exc
    except (subprocess.SubprocessError, OSError, ValueError, KeyError, TypeError) as exc:
        raise ApiError(
            422, "tutorial_invalid_media", "Video belum dapat dikonversi. Coba rekam ulang."
        ) from exc


@router.post("/tutorials/{item_id}/video", response_model=TutorialUploadResponse)
def upload_tutorial(
    item_id: str,
    settings: SettingsDep,
    thresholds: ThresholdsDep,
    file: Annotated[UploadFile, File()],
    authorization: Annotated[str | None, Header()] = None,
) -> TutorialUploadResponse:
    item = next(
        (entry for entry in [*catalogue(), *catalogue("level_1")] if entry.item_id == item_id), None
    )
    if item is None:
        raise ApiError(404, "tutorial_unknown", "Target tutorial tidak ditemukan.")
    config = thresholds.tutorials
    max_bytes = config.max_upload_mb * 1024 * 1024
    with storage_client(settings, authorization) as client:
        check_video_upload(file, max_bytes)
        with TemporaryDirectory(prefix="cw_tutorial_", dir=settings.tmp_dir) as folder:
            source, output = Path(folder) / "input.mov", Path(folder) / "output.mp4"
            with source.open("wb") as dest:
                shutil.copyfileobj(file.file, dest)
            convert_video(source, output, config)
            size = output.stat().st_size
            if not 0 < size <= max_bytes:
                raise ApiError(
                    413, "file_too_large", "Hasil konversi terlalu besar. Rekam lebih singkat."
                )
            with output.open("rb") as body:
                response = client.post(
                    f"/storage/v1/object/{BUCKET}/{item.storage_path}",
                    headers={
                        "Content-Type": "video/mp4",
                        "x-upsert": "false",
                        "cache-control": "max-age=3600",
                    },
                    content=body,
                )
            if response.status_code == 409 or (
                response.status_code == 400 and response.json().get("statusCode") == "409"
            ):
                raise ApiError(
                    409,
                    "tutorial_exists",
                    "Video sudah ada. Periksa ulang daftar; video lama tetap disimpan.",
                )
            if response.status_code not in (200, 201):
                raise ApiError(
                    502,
                    "tutorial_upload_failed",
                    "Upload belum berhasil. Rekaman masih tersedia untuk dicoba lagi.",
                )
            verification = client.get(f"/storage/v1/object/info/{BUCKET}/{item.storage_path}")
            if verification.status_code != 200 or verification.json().get("size") != size:
                raise ApiError(
                    502,
                    "tutorial_not_verified",
                    "Upload belum terverifikasi. Periksa ulang daftar sebelum merekam ulang.",
                )
    return TutorialUploadResponse(
        item_id=item.item_id, bucket=BUCKET, storage_path=item.storage_path, size_bytes=size
    )
