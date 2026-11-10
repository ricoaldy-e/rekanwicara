"""Segmentation (SPEC §6.6): speech region, lip closures and syllable units (audio clock, ms).

Closures (A2 findings): the lips are also closed at rest, so a closure counts only when the lips
open again (release) inside the speech region, and closure_ms / voiced_ratio / closure_db are
measured over at most ``closure_max_ms`` before the release and not before the speech region starts
(a word-initial closure merges with the silent rest before it).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from scipy.signal import find_peaks

from app.core.thresholds import SegmentConfig
from app.pipeline.audio import AudioSeries
from app.pipeline.features import ClipFeatures
from app.pipeline.lips import LipSeries
from app.pipeline.quality import longest_run

Span = tuple[float, float]


@dataclass(frozen=True)
class Closure:
    start_ms: float  # start of the measured window (clipped to closure_max_ms before the release)
    release_ms: float
    voiced_ratio: float  # §6.6.3: share of voiced audio frames in the window
    closure_db: float  # median intensity in the window

    @property
    def closure_ms(self) -> float:
        return self.release_ms - self.start_ms


@dataclass(frozen=True)
class UnitSpan:
    target: str
    start_ms: float
    end_ms: float
    vowel_start_ms: float  # the vowel part runs from here to end_ms
    closure: Closure | None  # None for a vowel unit, or a consonant whose closure is missing


def has_consonant(unit: str) -> bool:
    return len(unit) == 2  # "ma", "pa", "bu", ... ("m_hum" is scored on its own)


def speech_region(feats: ClipFeatures, cfg: SegmentConfig, step_ms: float) -> Span | None:
    """§6.6.1 region. Gaps are bridged up to closure_max_ms, so a silent /p/ closure does not cut a
    word in two. With an uncertain noise floor (A1 safeguard) the quality region is used as is."""
    a, db = feats.audio, feats.voice.intensity_db
    if a.speech_start_ms is None or db.size == 0:
        return None
    if a.noise_floor_uncertain:
        return float(a.speech_start_ms), float(a.speech_start_ms + a.speech_ms)
    run = longest_run(
        db > a.noise_floor_db + cfg.speech_margin_db, int(cfg.closure_max_ms // step_ms)
    )
    if run is None:
        return None
    t = feats.voice.t_ms
    return float(t[run[0]]), float(t[run[1] - 1] + step_ms)


def find_closures(
    lips: LipSeries, voice: AudioSeries, region: Span, cfg: SegmentConfig, frame_ms: float
) -> list[Closure]:
    closed, t = lips.closed, lips.t_ms
    out: list[Closure] = []
    i = 0
    while i < closed.size:
        if not closed[i]:
            i += 1
            continue
        j = i
        while j < closed.size and closed[j]:
            j += 1
        if j == closed.size:  # still closed at the end of the clip (rest): no release
            break
        # The lips opened between the last closed and the first open frame: take the midpoint,
        # so the window does not swallow up to a frame (67 ms) of the following vowel.
        release = (float(t[j - 1]) + float(t[j])) / 2
        long_enough = (
            j - i >= cfg.closure_min_frames
            and float(t[j - 1]) + frame_ms - t[i] >= cfg.closure_min_ms
        )
        released_in_speech = region[0] - cfg.release_tolerance_ms <= release <= region[1]
        if long_enough and released_in_speech:
            # A word-initial closure starts at rest: only its part inside the speech region counts
            # (an /m/ or /b/ hum is speech, the silence before it is not).
            start = max(float(t[i]), release - cfg.closure_max_ms, min(region[0], release))
            window = (voice.t_ms >= start) & (voice.t_ms < release)
            out.append(
                Closure(
                    start_ms=start,
                    release_ms=release,
                    voiced_ratio=float(voice.voiced[window].mean()) if window.any() else 0.0,
                    closure_db=float(np.median(voice.intensity_db[window]))
                    if window.any()
                    else 0.0,
                )
            )
        i = j
    return out


def _valley_boundaries(voice: AudioSeries, region: Span, n: int, cfg: SegmentConfig) -> list[float]:
    """§6.6.5 fallback: the ``n`` deepest intensity valleys in the region, in time order."""
    if n <= 0:
        return []
    inside = (voice.t_ms >= region[0]) & (voice.t_ms < region[1])
    t, db = voice.t_ms[inside], voice.intensity_db[inside]
    step = float(np.diff(voice.t_ms[:2])[0]) if voice.t_ms.size > 1 else 10.0
    valleys, _ = find_peaks(-db, distance=max(1, int(cfg.valley_min_gap_ms // step)))
    if valleys.size >= n:
        deepest = valleys[np.argsort(db[valleys])[:n]]
        return sorted(float(t[k]) for k in deepest)
    return [region[0] + (region[1] - region[0]) * (k + 1) / (n + 1) for k in range(n)]


def segment_units(
    units: Sequence[str], closures: Sequence[Closure], voice: AudioSeries, region: Span,
    cfg: SegmentConfig,
) -> list[UnitSpan]:  # fmt: skip
    """§6.6.4-5: one span per unit. Boundaries at closure starts when the closures match the
    template's consonants; otherwise at intensity valleys, and consonants without a closure in their
    unit get ``closure=None`` (scored as closure_missing)."""
    cons = [k for k, u in enumerate(units) if has_consonant(u)]
    found = list(closures)
    if not has_consonant(units[0]):
        # Word starts with a vowel: lips opening from rest just before the voice is no consonant.
        found = [c for c in found if c.release_ms > region[0] + cfg.release_tolerance_ms]

    later_vowel = any(not has_consonant(u) for u in units[1:])
    if len(found) == len(cons) and not later_vowel:
        owner = dict(zip(cons, found, strict=True))
        starts = [owner[k].start_ms if k in owner else region[0] for k in range(len(units))]
    else:
        valleys = _valley_boundaries(voice, region, len(units) - 1, cfg)
        starts = [region[0], *valleys]
        owner = {}
        unused = list(found)
        for k in cons:
            end = starts[k + 1] if k + 1 < len(units) else region[1]
            match = next(
                (c for c in unused if starts[k] - cfg.release_tolerance_ms <= c.release_ms < end),
                None,
            )
            if match is not None:
                owner[k] = match
                unused.remove(match)

    spans: list[UnitSpan] = []
    for k, unit in enumerate(units):
        start = starts[k]
        end = starts[k + 1] if k + 1 < len(units) else max(region[1], start + 1)
        closure = owner.get(k)
        vowel_start = closure.release_ms if closure is not None else start
        spans.append(
            UnitSpan(
                target=unit,
                start_ms=start,
                end_ms=end,
                vowel_start_ms=min(vowel_start, end - 1),
                closure=closure,
            )
        )
    return spans
