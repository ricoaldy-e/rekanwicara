"""Phase A1 orchestration: upload -> media -> face track + audio -> quality flags.

``ClipFeatures`` keeps the raw per-frame face results and the audio samples in memory for phase A2;
nothing derived from the recording is written to disk (the temp dir is gone when this returns).
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

import numpy as np
import soundfile as sf

from app.core.thresholds import Thresholds
from app.pipeline.face import FaceFrame, FaceModelMissing, track_faces
from app.pipeline.media import prepared_media
from app.pipeline.quality import (
    AudioMetrics,
    FaceMetrics,
    audio_metrics,
    face_metrics,
    quality_flags,
)


@dataclass(frozen=True)
class Timings:
    media_ms: int
    landmarker_init_ms: int
    face_detect_ms: int
    audio_ms: int
    total_ms: int


@dataclass(frozen=True)
class ClipFeatures:
    frames: list[FaceFrame]  # raw landmarks + blendshapes + timestamp_ms (for A2)
    samples: np.ndarray | None  # mono float64 in [-1, 1], or None without audio
    sample_rate: int
    av_offset_ms: int
    audio: AudioMetrics
    face: FaceMetrics
    quality_flags: list[str]
    timings: Timings


def _ms_since(start: float) -> int:
    return round((time.perf_counter() - start) * 1000)


def extract_clip_features(
    src: BinaryIO, thresholds: Thresholds, model_path: Path, tmp_root: Path | None = None
) -> ClipFeatures:
    if not model_path.is_file():  # fail before spending time on ffmpeg
        raise FaceModelMissing("face_landmarker.task not found; run scripts/download_models.py")

    t0 = time.perf_counter()
    with prepared_media(src, thresholds.media, tmp_root=tmp_root) as media:
        media_ms = _ms_since(t0)

        samples: np.ndarray | None = None
        sr = thresholds.media.audio_sample_rate_hz
        if media.wav_path is not None:
            data, sr = sf.read(media.wav_path, dtype="float64", always_2d=False)
            samples = data if data.ndim == 1 else data.mean(axis=1)

        track = track_faces(media.frame_paths, media.frame_timestamps_ms, model_path)
        av_offset_ms = media.av_offset_ms

    t_audio = time.perf_counter()
    audio = audio_metrics(samples, sr, thresholds.quality, thresholds.segment, thresholds.audio)
    audio_ms = _ms_since(t_audio)
    face = face_metrics(track.frames, thresholds.lips.landmarks)

    return ClipFeatures(
        frames=track.frames,
        samples=samples,
        sample_rate=sr,
        av_offset_ms=av_offset_ms,
        audio=audio,
        face=face,
        quality_flags=quality_flags(audio, face, thresholds.quality),
        timings=Timings(
            media_ms=media_ms,
            landmarker_init_ms=track.landmarker_init_ms,
            face_detect_ms=track.detect_ms,
            audio_ms=audio_ms,
            total_ms=_ms_since(t0),
        ),
    )
