"""Per-frame lip features (SPEC §6.4) from the MediaPipe Face Landmarker results.

Distances are measured in PIXELS: landmark x and y are normalised separately by the frame width
and height, so a portrait frame (e.g. 270 x 480) would otherwise squash horizontal distances.

Normalisation: every distance is divided by ``mouth_width_rest``. That rest width is stored
relative to the outer eye distance (33-263) of the same frame, so it holds at any distance from
the camera. With calibration (phase A3) it is the user's own ratio; without it,
``default_mouth_to_eye_ratio``
(see ``calibration.lip_rest``).

Times: ``t_ms`` is ms since the start of the AUDIO (frame time minus ``av_offset_ms``), the same
clock as ``audio.AudioSeries``.
"""

from __future__ import annotations

import warnings
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

from app.core.thresholds import LipsConfig, Thresholds
from app.pipeline.face import FaceFrame

# MediaPipe blendshape category names.
JAW_OPEN, PUCKER, FUNNEL, MOUTH_CLOSE = "jawOpen", "mouthPucker", "mouthFunnel", "mouthClose"


@dataclass(frozen=True)
class LipRest:
    """Resting values subtracted/divided per §6.4. Calibration (A3) fills these per user."""

    mouth_width_rest: float  # mouth width (61-291) / outer eye distance (33-263)
    jaw_open: float = 0.0
    rounding: float = 0.0


@dataclass(frozen=True)
class LipSeries:
    """One value per video frame; NaN (closed: False) where no face was found.

    The NaN-aware median filter bridges a single face-less frame with its neighbours; longer
    runs stay NaN.
    """

    t_ms: np.ndarray  # int, ms since audio start
    jaw_open: np.ndarray
    lip_gap_ratio: np.ndarray
    lip_width_ratio: np.ndarray
    rounding: np.ndarray
    mouth_close: np.ndarray  # raw mouthClose blendshape, to cross-check ``closed`` (§6.4)
    closed: np.ndarray  # bool


def default_lip_rest(t: Thresholds) -> LipRest:
    """§6.3 population defaults, used without calibration."""
    return LipRest(
        mouth_width_rest=t.lips.default_mouth_to_eye_ratio,
        jaw_open=t.defaults.rest_jaw_open,
        rounding=t.defaults.rest_rounding,
    )


def median_filter(x: np.ndarray, size: int) -> np.ndarray:
    """Centred median over ``size`` frames, ignoring NaN; edges repeat the edge value."""
    if size <= 1 or x.size == 0:
        return x.astype(float)
    pad = size // 2
    windows = sliding_window_view(np.pad(x.astype(float), pad, mode="edge"), size)
    with warnings.catch_warnings():  # an all-NaN window (no face) stays NaN
        warnings.simplefilter("ignore", RuntimeWarning)
        return np.nanmedian(windows, axis=1)


def lip_series(
    frames: Sequence[FaceFrame],
    image_size: tuple[int, int],
    av_offset_ms: int,
    cfg: LipsConfig,
    rest: LipRest,  # calibration.lip_rest(): the user's values or the §6.3 defaults
) -> LipSeries:
    lm = cfg.landmarks
    scale = np.array(image_size, dtype=float)  # (width, height)
    n = len(frames)
    raw = {k: np.full(n, np.nan) for k in ("jaw", "gap", "width", "round", "close")}

    for i, f in enumerate(frames):
        if f.landmarks is None:
            continue
        xy = f.landmarks[:, :2].astype(float) * scale
        unit = (
            np.linalg.norm(xy[lm.eye_outer_left] - xy[lm.eye_outer_right]) * rest.mouth_width_rest
        )
        if unit <= 0:
            continue
        bs = f.blendshapes or {}
        raw["gap"][i] = np.linalg.norm(xy[lm.upper_inner] - xy[lm.lower_inner]) / unit
        raw["width"][i] = np.linalg.norm(xy[lm.corner_left] - xy[lm.corner_right]) / unit
        raw["jaw"][i] = bs.get(JAW_OPEN, np.nan) - rest.jaw_open
        raw["round"][i] = np.fmax(bs.get(PUCKER, np.nan), bs.get(FUNNEL, np.nan)) - rest.rounding
        raw["close"][i] = bs.get(MOUTH_CLOSE, np.nan)

    k = cfg.median_filter_frames
    smooth = {name: median_filter(v, k) for name, v in raw.items()}
    closed = np.nan_to_num(smooth["gap"], nan=np.inf) < cfg.closed_gap_ratio
    return LipSeries(
        t_ms=np.array([f.timestamp_ms - av_offset_ms for f in frames], dtype=int),
        jaw_open=smooth["jaw"],
        lip_gap_ratio=smooth["gap"],
        lip_width_ratio=smooth["width"],
        rounding=smooth["round"],
        mouth_close=smooth["close"],
        closed=closed,
    )


def middle_median(
    values: np.ndarray, t_ms: np.ndarray, start_ms: float, end_ms: float, fraction: float
) -> float:
    """Median over the frames in the middle ``fraction`` of [start, end) (§6.3, §6.7 vowels).

    Short vowels can hold no frame in their middle half: then the frame nearest the centre is used.
    NaN when there is no face there.
    """
    margin = (end_ms - start_ms) * (1 - fraction) / 2
    inside = (t_ms >= start_ms + margin) & (t_ms < end_ms - margin) & np.isfinite(values)
    if inside.any():
        return float(np.median(values[inside]))
    if t_ms.size == 0:
        return float("nan")
    return float(values[int(np.argmin(np.abs(t_ms - (start_ms + end_ms) / 2)))])


def span_peak(
    values: np.ndarray, t_ms: np.ndarray, start_ms: float, end_ms: float, highest: bool
) -> float:
    """Highest (or lowest) value of the frames in [start, end): how far the mouth got towards the
    target shape. Vowels in words last only 3-6 frames at 15 fps, so their middle is too short to
    hold the target (A3). Falls back to the frame nearest the centre; NaN without a face."""
    inside = (t_ms >= start_ms) & (t_ms < end_ms) & np.isfinite(values)
    if inside.any():
        return float(values[inside].max() if highest else values[inside].min())
    return middle_median(values, t_ms, start_ms, end_ms, 1.0)


def lip_contour(
    frame: FaceFrame, image_size: tuple[int, int], cfg: LipsConfig
) -> np.ndarray | None:
    """Outer lip ring (§6.4) in px, scaled 0-1 within the mouth bounding box. Shape (n, 2)."""
    if frame.landmarks is None:
        return None
    pts = frame.landmarks[list(cfg.outer_lip), :2].astype(float) * np.array(image_size, dtype=float)
    lo, hi = pts.min(axis=0), pts.max(axis=0)
    return (pts - lo) / np.maximum(hi - lo, 1e-9)
