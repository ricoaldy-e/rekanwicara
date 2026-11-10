"""Scoring rules (SPEC §6.7) and status/score (§6.8). Pure functions on feature series: no video.

kuning: "within 15% of the threshold" = relative to the threshold value (A3 decision), unless SPEC
gives an explicit yellow limit (L0, p, b). A missing value (NaN) is merah.
Vowel lip features are the peak towards the target shape over the vowel part (``lips.span_peak``);
F1/F2 the §6.5 median over its voiced middle.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np

from app.api.schemas import ReasonCode, Status
from app.core.thresholds import Thresholds
from app.pipeline.audio import AudioSeries, vowel_median
from app.pipeline.lips import LipSeries, span_peak
from app.pipeline.quality import longest_run
from app.pipeline.segment import Span, UnitSpan, find_closures, has_consonant, segment_units

SEVERITY: dict[Status, int] = {"hijau": 0, "kuning": 1, "merah": 2}
Anchors = dict[str, tuple[float, float]]


def worst(statuses: Sequence[Status]) -> Status:
    return max(statuses, key=lambda s: SEVERITY[s])


def score_of(statuses: Sequence[Status]) -> float:
    """§6.8: (hijau + 0.5 x kuning) / number of units."""
    value = sum(1.0 if s == "hijau" else 0.5 if s == "kuning" else 0.0 for s in statuses)
    return round(value / len(statuses), 3)


def at_least(value: float, green: float, margin: float, yellow: float | None = None) -> Status:
    if math.isnan(value):
        return "merah"
    if value >= green:
        return "hijau"
    if yellow is None:
        yellow = green - margin * abs(green)
    return "kuning" if value >= yellow else "merah"


def at_most(value: float, green: float, margin: float, yellow: float | None = None) -> Status:
    if math.isnan(value):
        return "merah"
    if value <= green:
        return "hijau"
    if yellow is None:
        yellow = green + margin * abs(green)
    return "kuning" if value <= yellow else "merah"


@dataclass(frozen=True)
class Check:
    status: Status
    reason: ReasonCode | None  # set when status != hijau


def _check(status: Status, reason: ReasonCode) -> Check:
    return Check(status, None if status == "hijau" else reason)


@dataclass(frozen=True)
class UnitScore:
    index: int
    target: str
    start_ms: float
    end_ms: float
    bibir: Status | None  # None for Level 0
    suara: Status
    status: Status
    reason_code: ReasonCode | None
    formants: tuple[float, float] | None  # median F1/F2 of the unit's vowel


@dataclass(frozen=True)
class ItemScore:
    units: list[UnitScore]

    @property
    def statuses(self) -> list[Status]:
        return [u.status for u in self.units]

    @property
    def vowel_point(self) -> tuple[float, float] | None:
        return next((u.formants for u in reversed(self.units) if u.formants), None)


def _unit(
    index: int, span: Span, target: str, lips: list[Check], voice: list[Check],
    formants: tuple[float, float] | None = None, level0: bool = False,
) -> UnitScore:  # fmt: skip
    """Unit = worst of its parts (§6.7). reason_code: the most severe problem; lips first on a tie
    (§6.9 rule 3)."""
    bibir = None if level0 else worst([c.status for c in lips])
    suara = worst([c.status for c in voice])
    status = worst([s for s in (bibir, suara) if s is not None])
    reason = next((c.reason for c in [*lips, *voice] if c.status == status and c.reason), None)
    return UnitScore(index, target, span[0], span[1], bibir, suara, status, reason, formants)


# ---------- Level 0 ----------


def score_hold_a(voice: AudioSeries, t: Thresholds) -> ItemScore:
    """Longest voiced stretch, gaps up to gap_tolerance_ms bridged (§6.7)."""
    step = _step_ms(voice)
    run = longest_run(voice.voiced, int(t.segment.gap_tolerance_ms // step))
    cfg = t.rules.l0_hold_a
    if run is None:
        span, seconds = (0.0, 0.0), 0.0
    else:
        span = (float(voice.t_ms[run[0]]), float(voice.t_ms[run[1] - 1] + step))
        seconds = (span[1] - span[0]) / 1000
    status = at_least(seconds, cfg.min_voiced_s, 0, cfg.yellow_min_voiced_s)
    check = _check(status, "l0_duration_short")
    return ItemScore([_unit(0, span, "a", [], [check], level0=True)])


def score_soft_loud(voice: AudioSeries, t: Thresholds) -> ItemScore:
    """Two parts split at the longest pause between the first and last voiced frame (else halves);
    the louder second part must be >= 6 dB above the first (§6.7)."""
    cfg = t.rules.l0_soft_loud
    idx = np.flatnonzero(voice.voiced)
    if idx.size < 2:
        miss = _check("merah", "l0_loudness_flat")
        return ItemScore([_unit(k, (0.0, 0.0), "a", [], [miss], level0=True) for k in (0, 1)])
    first, last = int(idx[0]), int(idx[-1])
    pause = longest_run(~voice.voiced[first : last + 1], 0)
    split = first + (pause[0] + pause[1]) // 2 if pause is not None else (first + last) // 2
    db, v = voice.intensity_db, voice.voiced
    soft = float(np.median(db[first:split][v[first:split]])) if v[first:split].any() else 0.0
    loud = float(np.median(db[split : last + 1][v[split : last + 1]]))
    status = at_least(loud - soft, cfg.min_diff_db, 0, cfg.yellow_min_diff_db)
    t0, ts, t1 = (float(voice.t_ms[k]) for k in (first, split, last))
    ok = Check("hijau", None)
    return ItemScore(
        [
            _unit(0, (t0, ts), "a", [], [ok], level0=True),
            _unit(1, (ts, t1), "a", [], [_check(status, "l0_loudness_flat")], level0=True),
        ]
    )


# ---------- Level 1-3 ----------


def score_hum(lips: LipSeries, voice: AudioSeries, region: Span, t: Thresholds) -> ItemScore:
    cfg, margin = t.rules.m_hum, t.rules.yellow_margin
    in_lips = (lips.t_ms >= region[0]) & (lips.t_ms < region[1])
    in_voice = (voice.t_ms >= region[0]) & (voice.t_ms < region[1])
    closed = float(lips.closed[in_lips].mean()) if in_lips.any() else 0.0
    voiced = float(voice.voiced[in_voice].mean()) if in_voice.any() else 0.0
    seconds = (region[1] - region[0]) / 1000
    lip = _check(at_least(closed, cfg.closed_min_ratio, margin), "hum_open")
    sound = _check(
        worst([at_least(voiced, cfg.voiced_ratio_min, margin),
               at_least(seconds, cfg.min_duration_s, margin)]),
        "hum_short",
    )  # fmt: skip
    return ItemScore([_unit(0, region, "m_hum", [lip], [sound])])


def _vowel_checks(
    vowel: str, lips: LipSeries, voice: AudioSeries, span: Span, anchors: Anchors, t: Thresholds
) -> tuple[Check, Check, tuple[float, float] | None]:
    frac, margin, rules = t.audio.vowel_center_fraction, t.rules.yellow_margin, t.rules.vowels

    def lip(series: np.ndarray, highest: bool = True) -> float:
        return span_peak(series, lips.t_ms, span[0], span[1], highest)

    formants = vowel_median(voice, span[0], span[1], frac)
    f1, f2 = formants if formants is not None else (math.nan, math.nan)
    (f1_i, f2_i), (f1_u, f2_u) = anchors["i"], anchors["u"]

    if vowel == "a":
        lip_status = at_least(lip(lips.jaw_open), rules.a.jaw_open_min, margin)
        lip_reason: ReasonCode = "vowel_open_low"
        voice_status = at_least(f1, max(f1_i, f1_u) + rules.a.f1_margin_hz, margin)
    elif vowel == "i":
        lip_status = worst([
            at_least(lip(lips.lip_width_ratio), rules.i.lip_width_ratio_min, margin),
            at_most(lip(lips.rounding, highest=False), rules.i.rounding_max, margin),
        ])  # fmt: skip
        lip_reason = "vowel_spread_low"
        voice_status = at_least(f2, f2_u + rules.i.f2_margin_hz, margin)
    elif vowel == "u":
        lip_status = worst([
            at_least(lip(lips.rounding), rules.u.rounding_min, margin),
            at_most(lip(lips.lip_width_ratio, highest=False), rules.u.lip_width_ratio_max, margin),
        ])  # fmt: skip
        lip_reason = "vowel_round_low"
        voice_status = at_most(f2, f2_i - rules.u.f2_margin_hz, margin)
    else:  # e/o are bonus items, inactive; the API rejects inactive items
        raise ValueError(f"vowel '{vowel}' is not scored in the MVP")
    return (
        _check(lip_status, lip_reason),
        _check(voice_status, "vowel_acoustic_mismatch"),
        formants,
    )


def _consonant_checks(span: UnitSpan, t: Thresholds) -> tuple[Check, Check]:
    c, margin, rules = span.target[0], t.rules.yellow_margin, t.rules.consonants
    closure = span.closure
    if closure is None:  # §6.6.5: no closure found for this consonant
        return Check("merah", "closure_missing"), Check("hijau", None)
    lip = Check("hijau", None)  # a closure >= closure_min_ms followed by a release
    vr = closure.voiced_ratio
    if c == "p":
        return lip, _check(
            at_most(vr, rules.p.voiced_ratio_max, margin, rules.p.yellow_voiced_ratio_max),
            "closure_voicing_unexpected",
        )
    if c == "b":
        status = at_least(vr, rules.b.voiced_ratio_min, margin, rules.b.yellow_voiced_ratio_min)
    else:  # m (the §6.7 "bonus" closure_ms/closure_db check does not change the status)
        status = at_least(vr, rules.m.voiced_ratio_min, margin)
    return lip, _check(status, "closure_voicing_expected")


def score_units(
    units: Sequence[str], lips: LipSeries, voice: AudioSeries, region: Span, anchors: Anchors,
    t: Thresholds,
) -> ItemScore:  # fmt: skip
    """Level 1-3 items: vowels, syllables, words (and m_hum)."""
    if list(units) == ["m_hum"]:
        return score_hum(lips, voice, region, t)
    frame_ms = 1000 / t.media.fps
    closures = find_closures(lips, voice, region, t.segment, frame_ms)
    spans = segment_units(units, closures, voice, region, t.segment)
    scored: list[UnitScore] = []
    for k, span in enumerate(spans):
        vowel_lip, vowel_voice, formants = _vowel_checks(
            span.target[-1], lips, voice, (span.vowel_start_ms, span.end_ms), anchors, t
        )
        lip_checks, voice_checks = [vowel_lip], [vowel_voice]
        if has_consonant(span.target):
            c_lip, c_voice = _consonant_checks(span, t)
            lip_checks.insert(0, c_lip)
            voice_checks.insert(0, c_voice)
        scored.append(
            _unit(k, (span.start_ms, span.end_ms), span.target, lip_checks, voice_checks, formants)
        )
    return ItemScore(scored)


def score_item(
    item_id: str, units: Sequence[str], lips: LipSeries, voice: AudioSeries, region: Span,
    anchors: Anchors, t: Thresholds,
) -> ItemScore:  # fmt: skip
    if item_id == "l0_hold_a":
        return score_hold_a(voice, t)
    if item_id == "l0_soft_loud":
        return score_soft_loud(voice, t)
    return score_units(units, lips, voice, region, anchors, t)


def _step_ms(voice: AudioSeries) -> float:
    return float(np.diff(voice.t_ms[:2])[0]) if voice.t_ms.size > 1 else 10.0
