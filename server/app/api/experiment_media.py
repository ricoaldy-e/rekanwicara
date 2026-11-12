"""Shared temporary audio extraction for development-only speech experiments."""

import shutil
import subprocess
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from fastapi import UploadFile

from app.api.errors import ApiError
from app.api.uploads import check_video_upload
from app.core.settings import Settings
from app.core.thresholds import MediaConfig
from app.pipeline.media import (
    FFMPEG_TIMEOUT_S,
    MediaError,
    MediaToolsMissing,
    find_tools,
    probe_streams,
)


@contextmanager
def experiment_audio(file: UploadFile, settings: Settings, cfg: MediaConfig) -> Iterator[Path]:
    try:
        check_video_upload(file, settings.max_upload_bytes)
        ffmpeg, ffprobe = find_tools()
        if settings.tmp_dir is not None:
            settings.tmp_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="cw_speech_", dir=settings.tmp_dir) as directory:
            video, wav = Path(directory) / "input.mp4", Path(directory) / "audio.wav"
            file.file.seek(0)
            with video.open("wb") as target:
                shutil.copyfileobj(file.file, target)
            streams = probe_streams(ffprobe, video)
            if not streams.has_video or not streams.has_audio:
                raise ApiError(422, "audio_missing", "Video harus memiliki rekaman suara.")
            # One extra sample lets the CLI reject long clips instead of transcribing a truncation.
            limit = cfg.max_duration_s + 1 / cfg.audio_sample_rate_hz
            result = subprocess.run(
                [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-nostdin",
                    "-y",
                    "-i",
                    str(video),
                    "-map",
                    "0:a:0",
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    str(cfg.audio_sample_rate_hz),
                    "-c:a",
                    "pcm_s16le",
                    "-t",
                    str(limit),
                    str(wav),
                ],  # fmt: skip
                capture_output=True,
                timeout=FFMPEG_TIMEOUT_S,
                check=False,
            )
            if result.returncode != 0:
                raise ApiError(422, "invalid_media", "Suara pada video tidak dapat dibaca.")
            yield wav
    except MediaToolsMissing as exc:
        raise ApiError(503, exc.code, "FFmpeg/FFprobe belum tersedia di laptop.") from exc
    except MediaError as exc:
        raise ApiError(422, exc.code, "Video tidak dapat dibaca.") from exc
    except subprocess.TimeoutExpired as exc:
        raise ApiError(422, "media_timeout", "Pemrosesan video terlalu lama.") from exc
    except OSError as exc:
        raise ApiError(503, "media_unavailable", "Berkas sementara tidak dapat diproses.") from exc
    finally:
        file.file.close()
