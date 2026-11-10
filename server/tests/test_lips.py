"""Lip features (SPEC §6.4) on synthetic landmarks: no model needed."""

import numpy as np
import pytest

from app.core.thresholds import load_thresholds
from app.pipeline.face import FaceFrame
from app.pipeline.lips import (
    LipRest,
    default_lip_rest,
    lip_contour,
    lip_series,
    median_filter,
    middle_median,
    span_peak,
)

CFG = load_thresholds().lips
LM = CFG.landmarks
SIZE = (270, 480)  # portrait frame: width != height, so aspect handling matters
K = CFG.default_mouth_to_eye_ratio
EYE_PX = 0.4 * SIZE[0]  # eyes at x 0.3 and 0.7, same y
UNIT_PX = EYE_PX * K  # mouth_width_rest in px
REST = LipRest(mouth_width_rest=K)  # nothing subtracted


def face(gap_ratio: float, ts: int = 0, blend: dict[str, float] | None = None) -> FaceFrame:
    pts = np.zeros((478, 3), dtype=np.float32)
    pts[LM.eye_outer_left, :2] = (0.3, 0.4)
    pts[LM.eye_outer_right, :2] = (0.7, 0.4)
    pts[LM.corner_left, :2] = (0.4, 0.62)
    pts[LM.corner_right, :2] = (0.6, 0.62)
    dy = gap_ratio * UNIT_PX / SIZE[1]  # vertical gap, converted to normalised y
    pts[LM.upper_inner, :2] = (0.5, 0.6)
    pts[LM.lower_inner, :2] = (0.5, 0.6 + dy)
    for i, k in enumerate(CFG.outer_lip):  # a ring for lip_contour
        a = 2 * np.pi * i / len(CFG.outer_lip)
        pts[k, :2] = (0.5 + 0.1 * np.cos(a), 0.61 + 0.03 * np.sin(a))
    return FaceFrame(timestamp_ms=ts, landmarks=pts, blendshapes=blend or {})


def no_face(ts: int = 0) -> FaceFrame:
    return FaceFrame(timestamp_ms=ts, landmarks=None, blendshapes=None)


def test_closed_marks_the_right_frames_and_drops_a_one_frame_blip() -> None:
    gaps = [0.3, 0.3, 0.02, 0.02, 0.02, 0.3, 0.3, 0.01, 0.3, 0.3]  # frame 7: 1-frame blip
    s = lip_series([face(g, ts=i * 67) for i, g in enumerate(gaps)], SIZE, 0, CFG, REST)
    assert np.flatnonzero(s.closed).tolist() == [2, 3, 4]


def test_ratios_use_pixels_not_normalised_coordinates() -> None:
    s = lip_series([face(0.3)] * 3, SIZE, 0, CFG, REST)
    assert s.lip_gap_ratio[1] == pytest.approx(0.3, rel=1e-4)
    # Mouth corners 0.2 of the width apart = 54 px, divided by the rest width in px.
    assert s.lip_width_ratio[1] == pytest.approx(0.2 * SIZE[0] / UNIT_PX, rel=1e-4)


def test_calibrated_rest_width_changes_the_unit() -> None:
    rest = LipRest(mouth_width_rest=K / 2)  # a mouth half as wide at rest
    s = lip_series([face(0.3)] * 3, SIZE, 0, CFG, rest)
    assert s.lip_gap_ratio[1] == pytest.approx(0.6, rel=1e-4)


def test_blendshapes_minus_rest_and_rounding_is_max_of_pucker_funnel() -> None:
    blend = {"jawOpen": 0.5, "mouthPucker": 0.2, "mouthFunnel": 0.45, "mouthClose": 0.1}
    rest = LipRest(mouth_width_rest=K, jaw_open=0.1, rounding=0.05)
    s = lip_series([face(0.3, blend=blend)] * 3, SIZE, 0, CFG, rest)
    assert s.jaw_open[1] == pytest.approx(0.4)
    assert s.rounding[1] == pytest.approx(0.4)
    assert s.mouth_close[1] == pytest.approx(0.1)


def test_frames_without_face_are_nan_and_never_closed() -> None:
    frames = [face(0.02), no_face(), no_face(), no_face(), face(0.02)]
    s = lip_series(frames, SIZE, 0, CFG, REST)
    assert np.isnan(s.lip_gap_ratio[2]) and not s.closed[2]
    assert s.closed[0] and s.closed[4]


def test_times_are_on_the_audio_clock() -> None:
    s = lip_series([face(0.3, ts=0), face(0.3, ts=67)], SIZE, 500, CFG, REST)
    assert s.t_ms.tolist() == [-500, -433]


def test_default_rest_uses_the_population_defaults() -> None:
    t = load_thresholds()
    rest = default_lip_rest(t)
    assert rest.mouth_width_rest == t.lips.default_mouth_to_eye_ratio
    assert (rest.jaw_open, rest.rounding) == (t.defaults.rest_jaw_open, t.defaults.rest_rounding)


def test_span_peak_and_middle_median() -> None:
    t = np.array([0, 100, 200, 300, 400])
    v = np.array([0.1, 0.5, 0.2, 0.9, np.nan])
    assert span_peak(v, t, 0, 300, highest=True) == 0.5
    assert span_peak(v, t, 0, 300, highest=False) == 0.1
    assert span_peak(v, t, 120, 180, highest=True) == pytest.approx(0.5)  # no frame: nearest centre
    assert middle_median(v, t, 0, 400, 0.5) == pytest.approx(0.35)  # middle half: 0.5 and 0.2


def test_median_filter_ignores_nan_and_keeps_length() -> None:
    x = np.array([1.0, 5.0, 1.0, np.nan, 3.0])
    assert median_filter(x, 3).tolist() == [1.0, 1.0, 3.0, 2.0, 3.0]
    assert median_filter(np.zeros(0), 3).size == 0


def test_lip_contour_is_scaled_to_the_mouth_box() -> None:
    c = lip_contour(face(0.3), SIZE, CFG)
    assert c is not None and c.shape == (20, 2)
    assert c.min() == pytest.approx(0.0) and c.max() == pytest.approx(1.0)
    assert c[0, 0] == pytest.approx(1.0)  # first ring point is the rightmost (angle 0)
    assert lip_contour(no_face(), SIZE, CFG) is None
