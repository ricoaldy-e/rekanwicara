"""Synthetic lip and voice series for the segmentation/rules tests (no video, no model).

Timeline helpers take spans in ms. Lip frames are at 15 fps like the pipeline; voice at 10 ms.
"""

import numpy as np

from app.pipeline.audio import AudioSeries
from app.pipeline.lips import LipSeries

FPS = 15
CLOSED_GAP = 0.0
OPEN = {"gap": 0.4, "jaw": 0.5, "width": 1.0, "round": 0.0}


def lips(total_ms: int, spans: list[tuple[int, int, dict[str, float]]]) -> LipSeries:
    """Lips closed and neutral by default; each span overrides gap/jaw/width/round."""
    n = int(total_ms * FPS / 1000)
    t = np.array([round(k * 1000 / FPS) for k in range(n)])
    gap, jaw = np.full(n, CLOSED_GAP), np.zeros(n)
    width, rnd = np.ones(n), np.zeros(n)
    for start, end, values in spans:
        m = (t >= start) & (t < end)
        gap[m] = values.get("gap", gap[m])
        jaw[m] = values.get("jaw", jaw[m])
        width[m] = values.get("width", width[m])
        rnd[m] = values.get("round", rnd[m])
    return LipSeries(
        t_ms=t,
        jaw_open=jaw,
        lip_gap_ratio=gap,
        lip_width_ratio=width,
        rounding=rnd,
        mouth_close=np.zeros(n),
        closed=gap < 0.08,
    )


def voice(
    total_ms: int,
    voiced: list[tuple[int, int]],
    f1: float = 800.0,
    f2: float = 1400.0,
    loud: list[tuple[int, int, float]] | None = None,
) -> AudioSeries:
    """Voiced spans at 70 dB (or ``loud`` overrides), silence at 30 dB; F1/F2 only where voiced."""
    t = np.arange(0, total_ms, 10, dtype=float)
    v = np.zeros(t.size, dtype=bool)
    for start, end in voiced:
        v |= (t >= start) & (t < end)
    db = np.where(v, 70.0, 30.0)
    for start, end, level in loud or []:
        db[(t >= start) & (t < end)] = level
    return AudioSeries(
        t_ms=t,
        intensity_db=db,
        f0_hz=np.where(v, 120.0, 0.0),
        voiced=v,
        f1_hz=np.where(v, f1, np.nan),
        f2_hz=np.where(v, f2, np.nan),
    )


def mama(second_closure_voiced: bool = True) -> tuple[LipSeries, AudioSeries, tuple[float, float]]:
    """rest | m (hum) | a | m | a | rest. Speech region 300-1250 ms."""
    open_a = dict(OPEN)
    lip = lips(2000, [(500, 800, open_a), (950, 1250, open_a)])  # closed elsewhere
    hum2 = [(800, 950)] if second_closure_voiced else []
    v = voice(2000, [(300, 500), (500, 800), *hum2, (950, 1250)])
    return lip, v, (300.0, 1250.0)
