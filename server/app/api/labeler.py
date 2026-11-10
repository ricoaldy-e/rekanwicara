"""/labeler: the label-check page (SPEC §10.5). Registered only when DATASET_MODE=true.

Privacy and fairness:
* Only the laptop that runs the server may use it (the page plays recordings of faces).
* An annotator never gets the speaker, the intended error, the file name or any machine result;
  clips are addressed by an opaque token and shown in a per-annotator shuffled order.
* Recordings are HEVC (iPhone). Browsers on Windows often cannot play that, so each clip is
  converted once to H.264 into DATA_DIR/processed/labeler_cache (local, not committed) the first
  time it is played.
"""

from __future__ import annotations

import hashlib
import random
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import ContentDep, LabelStoreDep, SettingsDep
from app.api.errors import ApiError
from app.dataset.labels import (
    ANNOTATORS,
    MAX_NOTES,
    UNCLEAR,
    LabelError,
    clip_path,
    read_metadata,
)

PAGE = Path(__file__).with_name("labeler.html")
LOOPBACK = {"127.0.0.1", "::1", "localhost", "testclient"}
FFMPEG_TIMEOUT_S = 60
_transcode_lock = threading.Lock()


def _local_only(request: Request) -> None:
    client = request.client.host if request.client else None
    server = request.scope.get("server")
    same_machine = (
        bool(server) and client == server[0]
    )  # opened through the laptop's own LAN address
    if client not in LOOPBACK and not same_machine:
        raise ApiError(403, "labeler_local_only", "Cek label hanya bisa dibuka dari laptop server.")


router = APIRouter(prefix="/labeler", tags=["labeler"], dependencies=[Depends(_local_only)])


def _token(clip_id: str) -> str:
    return hashlib.sha1(f"cw-labeler|{clip_id}".encode()).hexdigest()[:16]  # noqa: S324 (an id, not security)


def _rows_by_token(raw_dir: Path) -> dict[str, dict[str, str]]:
    return {_token(r["clip_id"]): r for r in read_metadata(raw_dir)}


def _check_annotator(annotator: str) -> None:
    if annotator not in ANNOTATORS:
        raise ApiError(422, "invalid_annotator", "Annotator harus P1, P2, atau P3.")


@router.get("", response_class=HTMLResponse)
def page() -> HTMLResponse:
    return HTMLResponse(PAGE.read_text(encoding="utf-8"), headers={"Cache-Control": "no-store"})


class ClipOut(BaseModel):
    token: str
    item_id: str
    item_text: str
    emoji: str | None
    label: dict[str, object] | None


class ClipsOut(BaseModel):
    annotator: str
    total: int
    done: int
    options: list[dict[str, str]]  # what the annotator can say they heard
    clips: list[ClipOut]


@router.get("/api/clips", response_model=ClipsOut)
def clips(
    settings: SettingsDep,
    content: ContentDep,
    store: LabelStoreDep,
    annotator: Annotated[str, Query()],
) -> ClipsOut:
    """Every clip not recorded by ``annotator``, in a shuffle that is fixed per annotator."""
    _check_annotator(annotator)
    saved = store.load(annotator)
    recorded = read_metadata(settings.data_dir / "raw")
    rows = sorted((r for r in recorded if r["speaker_id"] != annotator), key=lambda r: r["clip_id"])
    random.Random(f"cw-labeler|{annotator}").shuffle(rows)
    out = []
    for r in rows:
        item = content.items_by_id.get(r["item_id"])
        if item is None:
            continue
        s = saved.get(r["clip_id"])
        out.append(
            ClipOut(
                token=_token(r["clip_id"]),
                item_id=item.item_id,
                item_text=item.text,
                emoji=item.emoji,
                label=None
                if s is None
                else {
                    "matches_request": s["matches_request"] == "1",
                    "heard_label": s["heard_label"],
                    "lips_wrong": s["lips_wrong"] == "1",
                    "quality_ok": s["quality_ok"] == "1",
                    "notes": s["notes"],
                },
            )
        )
    options = [{"value": i.item_id, "label": i.text} for i in content.active_items]
    options.append({"value": UNCLEAR, "label": "Tidak jelas"})
    return ClipsOut(
        annotator=annotator,
        total=len(out),
        done=sum(c.label is not None for c in out),
        options=options,
        clips=out,
    )


def _playable(src: Path, cache: Path) -> Path:
    """H.264 copy of ``src`` (made once); the original when ffmpeg is missing or fails."""
    if cache.is_file():
        return cache
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        return src
    with _transcode_lock:
        if cache.is_file():
            return cache
        cache.parent.mkdir(parents=True, exist_ok=True)
        tmp = cache.with_suffix(".part.mp4")
        cmd = [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", str(src),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-movflags", "+faststart", str(tmp),
        ]  # fmt: skip
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=FFMPEG_TIMEOUT_S)
            tmp.replace(cache)
        except (subprocess.SubprocessError, OSError):
            tmp.unlink(missing_ok=True)
            return src
    return cache


@router.get("/video/{token}", response_class=FileResponse)
def video(token: str, settings: SettingsDep) -> FileResponse:
    row = _rows_by_token(settings.data_dir / "raw").get(token)
    src = clip_path(settings.data_dir / "raw", row) if row else None
    if src is None or not src.is_file():
        raise ApiError(404, "not_found", "Klip tidak ditemukan.")
    cache = settings.data_dir / "processed" / "labeler_cache" / f"{token}.mp4"
    return FileResponse(
        _playable(src, cache), media_type="video/mp4", headers={"Cache-Control": "no-store"}
    )


class LabelIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    annotator: str
    token: str
    matches_request: bool
    heard_label: str = ""
    lips_wrong: bool = False
    quality_ok: bool = True
    notes: str = Field(default="", max_length=MAX_NOTES)


@router.post("/api/labels")
def save_label(
    body: LabelIn, settings: SettingsDep, content: ContentDep, store: LabelStoreDep
) -> dict[str, int]:
    _check_annotator(body.annotator)
    row = _rows_by_token(settings.data_dir / "raw").get(body.token)
    if row is None:
        raise ApiError(404, "not_found", "Klip tidak ditemukan.")
    try:
        store.save(
            body.annotator,
            row["clip_id"],
            matches_request=body.matches_request,
            heard_label=body.heard_label,
            lips_wrong=body.lips_wrong,
            quality_ok=body.quality_ok,
            notes=body.notes,
            known_heard_labels=[i.item_id for i in content.active_items],
        )
    except LabelError as exc:
        raise ApiError(422, exc.code, str(exc)) from exc
    mine = [
        r for r in read_metadata(settings.data_dir / "raw") if r["speaker_id"] != body.annotator
    ]
    done = store.load(body.annotator)
    return {"total": len(mine), "done": sum(r["clip_id"] in done for r in mine)}
