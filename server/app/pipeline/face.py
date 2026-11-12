"""Per-frame face detection with the MediaPipe Face Landmarker, VIDEO running mode (SPEC §6.4).

API per the official Python guide:
developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/python
``FaceLandmarker.create_from_options(FaceLandmarkerOptions(..., running_mode=VIDEO))`` then
``detect_for_video(mp.Image, timestamp_ms)`` with monotonically increasing timestamps.

A new landmarker is created per request (VIDEO mode keeps timestamp state; per-request instances are
also thread-safe). Raw results stay in memory as ``FaceFrame`` for the lip features of phase A2.
mediapipe is imported lazily so modules and tests that do not detect faces stay fast.
"""

from __future__ import annotations

import time
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from app.core.thresholds import LipLandmarks, QualityConfig


@dataclass(frozen=True)
class FaceMetrics:
    n_frames: int
    face_frames: int
    face_frame_ratio: float
    face_width_ratio: float | None  # median over face frames, share of frame width
    mouth_out_ratio: float | None  # share of face frames with a mouth point outside [0, 1]


def face_metrics(frames: Sequence[FaceFrame], landmarks: LipLandmarks) -> FaceMetrics:
    with_face = [f.landmarks for f in frames if f.landmarks is not None]
    n = len(frames)
    if not with_face:
        return FaceMetrics(
            n_frames=n, face_frames=0, face_frame_ratio=0.0,
            face_width_ratio=None, mouth_out_ratio=None,
        )  # fmt: skip

    widths = [float(lm[:, 0].max() - lm[:, 0].min()) for lm in with_face]
    mouth_idx = list(landmarks.mouth)
    out = 0
    for lm in with_face:
        pts = lm[mouth_idx, :2]
        if np.any((pts < 0.0) | (pts > 1.0)):
            out += 1
    return FaceMetrics(
        n_frames=n,
        face_frames=len(with_face),
        face_frame_ratio=len(with_face) / n,
        face_width_ratio=float(np.median(widths)),
        mouth_out_ratio=out / len(with_face),
    )


def face_quality_flags(face: FaceMetrics, q: QualityConfig) -> list[str]:
    flags: list[str] = []
    if face.n_frames == 0 or face.face_frame_ratio < q.face_min_frame_ratio:
        flags.append("no_face")
    if face.face_frames > 0:
        too_small = (face.face_width_ratio or 0.0) < q.face_min_width_ratio
        mouth_out = (face.mouth_out_ratio or 0.0) > q.mouth_out_max_frame_ratio
        if too_small or mouth_out:
            flags.append("face_off_frame")
    return flags


class FaceModelMissing(Exception):
    code = "face_model_missing"


@dataclass(frozen=True)
class FaceFrame:
    timestamp_ms: int
    # (478, 3) normalised x, y (by image width/height) and z; None when no face was found.
    landmarks: np.ndarray | None
    # 52 blendshape scores by category name (e.g. "jawOpen"); None when no face was found.
    blendshapes: dict[str, float] | None

    @property
    def has_face(self) -> bool:
        return self.landmarks is not None


@dataclass
class FaceTrack:
    frames: list[FaceFrame] = field(default_factory=list)
    # (width, height) in px of the analysed frames. Landmark x/y are normalised separately by
    # width and height, so distances need this aspect ratio (A2).
    image_size: tuple[int, int] = (0, 0)
    landmarker_init_ms: int = 0
    detect_ms: int = 0


def _ms_since(start: float) -> int:
    return round((time.perf_counter() - start) * 1000)


def track_faces(
    frame_paths: Sequence[Path], timestamps_ms: Sequence[int], model_path: Path
) -> FaceTrack:
    if len(frame_paths) != len(timestamps_ms):
        raise ValueError("frame_paths and timestamps_ms differ in length")
    if not model_path.is_file():
        raise FaceModelMissing("face_landmarker.task not found; run scripts/download_models.py")

    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions, vision

    start = time.perf_counter()
    options = vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(model_path)),
        running_mode=vision.RunningMode.VIDEO,
        num_faces=1,
        output_face_blendshapes=True,
    )
    track = FaceTrack()
    with vision.FaceLandmarker.create_from_options(options) as landmarker:
        track.landmarker_init_ms = _ms_since(start)
        start = time.perf_counter()
        for path, ts in zip(frame_paths, timestamps_ms, strict=True):
            image = mp.Image.create_from_file(str(path))
            track.image_size = (image.width, image.height)
            result = landmarker.detect_for_video(image, int(ts))
            track.frames.append(_to_face_frame(result, int(ts)))
        track.detect_ms = _ms_since(start)
    return track


def _to_face_frame(result: object, timestamp_ms: int) -> FaceFrame:
    faces = getattr(result, "face_landmarks", None) or []
    if not faces:
        return FaceFrame(timestamp_ms=timestamp_ms, landmarks=None, blendshapes=None)
    landmarks = np.array([(p.x, p.y, p.z) for p in faces[0]], dtype=np.float32)
    shapes = getattr(result, "face_blendshapes", None) or []
    blendshapes = {c.category_name: float(c.score) for c in shapes[0]} if shapes else {}
    return FaceFrame(timestamp_ms=timestamp_ms, landmarks=landmarks, blendshapes=blendshapes)
