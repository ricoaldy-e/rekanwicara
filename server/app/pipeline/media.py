"""Media preparation (SPEC §6.1): upload -> WAV mono 16 kHz + PNG frames at 15 fps, 480 px high.

Everything (the copied upload, the WAV, the frames) lives in ONE temporary directory that is
removed in ``finally``: after success, after an ffmpeg/ffprobe failure, and when the caller's
``with`` body raises.
Error messages never contain file paths or ffmpeg output (they can include the upload's name).
"""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

from app.core.thresholds import MediaConfig

logger = logging.getLogger("cermin_wicara.media")

FFMPEG_TIMEOUT_S = 60
FFPROBE_TIMEOUT_S = 20
_CHUNK = 1024 * 1024
WORKDIR_PREFIX = "cw_media_"


class MediaError(Exception):
    """The upload could not be read as a video (corrupt, no video stream, ffmpeg failure)."""

    code = "invalid_media"


class MediaToolsMissing(MediaError):
    """ffmpeg or ffprobe is not on PATH."""

    code = "media_tools_missing"


@dataclass(frozen=True)
class StreamInfo:
    has_video: bool
    has_audio: bool
    video_start_s: float | None
    audio_start_s: float | None

    @property
    def av_offset_ms(self) -> int:
        """Audio stream start minus video stream start, in ms (SPEC §6.1). 0 when unknown.

        Frame times and WAV times are each relative to their own stream start, so the same moment is
        at ``t_audio_ms = t_frame_ms - av_offset_ms``.
        """
        if self.video_start_s is None or self.audio_start_s is None:
            return 0
        return round((self.audio_start_s - self.video_start_s) * 1000)


@dataclass(frozen=True)
class PreparedMedia:
    """Paths are valid only inside the ``with prepared_media(...)`` block."""

    workdir: Path
    wav_path: Path | None  # None when the upload has no audio stream
    frame_paths: list[Path]
    frame_timestamps_ms: list[int]  # relative to the video stream start, strictly increasing
    streams: StreamInfo

    @property
    def av_offset_ms(self) -> int:
        return self.streams.av_offset_ms


def find_tools() -> tuple[str, str]:
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if ffmpeg is None or ffprobe is None:
        raise MediaToolsMissing("ffmpeg/ffprobe not found on PATH")
    return ffmpeg, ffprobe


def _run(cmd: list[str], timeout_s: int) -> subprocess.CompletedProcess[bytes]:
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=timeout_s, check=False)
    except subprocess.TimeoutExpired as exc:
        raise MediaError("media tool timed out") from exc
    except OSError as exc:
        raise MediaToolsMissing("media tool could not be started") from exc
    if proc.returncode != 0:
        # stderr is NOT included: it may contain paths. Only the exit code.
        raise MediaError(f"media tool failed (exit {proc.returncode})")
    return proc


def _parse_start(value: object) -> float | None:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None  # "N/A" or missing


def probe_streams(ffprobe: str, path: Path) -> StreamInfo:
    cmd = [
        ffprobe, "-v", "error",
        "-show_entries", "stream=codec_type,start_time",
        "-of", "json", str(path),
    ]  # fmt: skip
    proc = _run(cmd, FFPROBE_TIMEOUT_S)
    try:
        streams = json.loads(proc.stdout or b"{}").get("streams", [])
    except json.JSONDecodeError as exc:
        raise MediaError("unreadable probe output") from exc

    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    return StreamInfo(
        has_video=video is not None,
        has_audio=audio is not None,
        video_start_s=_parse_start(video.get("start_time")) if video else None,
        audio_start_s=_parse_start(audio.get("start_time")) if audio else None,
    )


def extract(ffmpeg: str, src: Path, workdir: Path, streams: StreamInfo, cfg: MediaConfig) -> None:
    """One ffmpeg call: frames (fps + scale, auto-rotated) and, if present, mono 16 kHz PCM WAV."""
    frames_dir = workdir / "frames"
    frames_dir.mkdir()
    cmd = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
        "-i", str(src),
        # Video: normalise the frame rate, 480 px high, width even and aspect-preserving.
        "-map", "0:v:0", "-an",
        "-vf", f"fps={cfg.fps},scale=-2:{cfg.frame_height_px}",
        "-t", str(cfg.max_duration_s),
        "-compression_level", "1",  # PNG: fast, the frames live only for this request
        str(frames_dir / "%05d.png"),
    ]  # fmt: skip
    if streams.has_audio:
        cmd += [
            "-map", "0:a:0", "-vn",
            "-ac", "1", "-ar", str(cfg.audio_sample_rate_hz), "-c:a", "pcm_s16le",
            "-t", str(cfg.max_duration_s),
            str(workdir / "audio.wav"),
        ]  # fmt: skip
    _run(cmd, FFMPEG_TIMEOUT_S)


def frame_timestamps_ms(n_frames: int, fps: int) -> list[int]:
    """Timestamp of frame i at a constant ``fps``: round(i * 1000 / fps). Strictly increasing."""
    return [round(i * 1000 / fps) for i in range(n_frames)]


def _copy_upload(src: BinaryIO, dest: Path) -> None:
    src.seek(0)
    with dest.open("wb") as out:
        while chunk := src.read(_CHUNK):
            out.write(chunk)


def remove_workdir(workdir: Path) -> None:
    shutil.rmtree(workdir, ignore_errors=True)
    if workdir.exists():  # e.g. a file still locked on Windows: retry once, then log (no path)
        shutil.rmtree(workdir, ignore_errors=True)
        if workdir.exists():
            logger.error("temp media cleanup failed")


@contextmanager
def prepared_media(
    src: BinaryIO, cfg: MediaConfig, tmp_root: Path | None = None
) -> Iterator[PreparedMedia]:
    """Copy ``src`` to a fresh temp dir, probe and extract it, yield the result, delete it all."""
    ffmpeg, ffprobe = find_tools()
    if tmp_root is not None:
        tmp_root.mkdir(parents=True, exist_ok=True)
    workdir = Path(tempfile.mkdtemp(prefix=WORKDIR_PREFIX, dir=tmp_root))
    try:
        upload = workdir / "input.mp4"
        _copy_upload(src, upload)

        streams = probe_streams(ffprobe, upload)
        if not streams.has_video:
            raise MediaError("no video stream")
        extract(ffmpeg, upload, workdir, streams, cfg)
        upload.unlink()  # not needed anymore; the directory is removed below anyway

        frames = sorted((workdir / "frames").glob("*.png"))
        if not frames:
            raise MediaError("no frames decoded")
        wav = workdir / "audio.wav"
        yield PreparedMedia(
            workdir=workdir,
            wav_path=wav if wav.exists() else None,
            frame_paths=frames,
            frame_timestamps_ms=frame_timestamps_ms(len(frames), cfg.fps),
            streams=streams,
        )
    finally:
        remove_workdir(workdir)
