"""Mock responses for MOCK_MODE (SPEC §5 "Mode mock").

The responses are shaped from the real item (unit count, level) and follow the status/score
rules of SPEC §6.8, so the app can be built against realistic data before the pipeline exists.
"""

import math
from typing import Literal

from app.api.schemas import (
    AnalyzeResponse,
    CalibrateResponse,
    CalibrationStep,
    FormantPoint,
    Indicators,
    Item,
    LipContour,
    Loudness,
    MockVariant,
    ReasonCode,
    ScorerName,
    Status,
    UnitResult,
    Visuals,
    VowelAnchors,
)
from app.pipeline.rules import score_of, worst  # the same §6.8 functions as the real pipeline

_ANCHORS = VowelAnchors(
    a=FormantPoint(f1=780, f2=1350),
    i=FormantPoint(f1=320, f2=2300),
    u=FormantPoint(f1=350, f2=900),
)
_VOWEL_POINTS = {
    "a": (760.0, 1330.0),
    "i": (330.0, 2250.0),
    "u": (360.0, 930.0),
    "e": (480.0, 1950.0),
    "o": (500.0, 1000.0),
}
_VOWEL_LIP_PROBLEM: dict[str, tuple[ReasonCode, str]] = {
    "a": ("vowel_open_low", "a_open"),
    "i": ("vowel_spread_low", "i_spread"),
    "u": ("vowel_round_low", "u_round"),
}
# Bonus vowels have no lip hint of their own; use the closest one.
_VOWEL_ACOUSTIC_HINT = {"e": "i_spread", "o": "u_round"}

Indicator = Literal["bibir", "suara"]


def _problem_for(item: Item, unit: str) -> tuple[Indicator, ReasonCode, str]:
    """Which indicator fails, the reason_code and its hint_id (SPEC §6.9) for a mock problem."""
    if item.level == 0:
        code: ReasonCode = (
            "l0_duration_short" if item.item_id == "l0_hold_a" else "l0_loudness_flat"
        )
        return "suara", code, code
    if unit == "m_hum":
        return "suara", "hum_short", "m_voicing"
    if len(unit) == 1:
        if unit in _VOWEL_LIP_PROBLEM:
            reason, hint = _VOWEL_LIP_PROBLEM[unit]
            return "bibir", reason, hint
        return "suara", "vowel_acoustic_mismatch", _VOWEL_ACOUSTIC_HINT[unit]
    consonant = unit[0]
    if consonant == "p":
        return "suara", "closure_voicing_unexpected", "p_silent"
    return "suara", "closure_voicing_expected", "m_voicing" if consonant == "m" else "b_voicing"


def _unit_timings(item: Item) -> list[tuple[int, int]]:
    if item.level == 0:
        start, length, gap = 200, 1400 if len(item.units) > 1 else 3200, 300
    else:
        start, length, gap = 120, 400, 0
    timings = []
    for _ in item.units:
        timings.append((start, start + length))
        start += length + gap
    return timings


def _lip_contour() -> LipContour:
    points = []
    for k in range(20):
        angle = 2 * math.pi * k / 20
        points.append(
            (round(0.5 + 0.45 * math.cos(angle), 3), round(0.5 + 0.3 * math.sin(angle), 3))
        )
    return LipContour(points=points)


def _loudness(item: Item, variant: MockVariant) -> Loudness:
    t_ms = list(range(0, 3500, 10))
    db = []
    for t in t_ms:
        if item.item_id == "l0_soft_loud":
            loud = variant == "hijau"
            level = 50.0 if t < 1700 else (62.0 if loud else 54.0)
        else:
            cutoff = 3400 if variant == "hijau" else 2200
            level = 58.0 if 200 <= t < cutoff else 35.0
        db.append(round(level + 1.5 * math.sin(t / 70), 1))
    return Loudness(t_ms=t_ms, db=db)


def _visuals(item: Item, variant: MockVariant) -> Visuals:
    if variant == "retry":
        return Visuals()
    if item.level == 0:
        return Visuals(loudness=_loudness(item, variant))
    last_vowel = next((u[-1] for u in reversed(item.units) if u != "m_hum"), None)
    vowel_point = None
    if last_vowel is not None:
        f1, f2 = _VOWEL_POINTS[last_vowel]
        if variant == "merah":
            f1, f2 = f1 * 0.85, f2 * 0.8 if last_vowel != "u" else f2 * 1.4
        vowel_point = FormantPoint(f1=round(f1, 1), f2=round(f2, 1))
    return Visuals(
        vowel_point=vowel_point,
        vowel_anchors=_ANCHORS if vowel_point is not None else None,
        lip_contour=_lip_contour(),
    )


def build_analyze_mock(
    item: Item,
    variant: MockVariant,
    scorer: ScorerName,
    engine_version: str,
    processing_ms: int,
) -> AnalyzeResponse:
    if variant == "retry":
        return AnalyzeResponse(
            status="retry",
            quality_flags=["too_quiet"],
            item_id=item.item_id,
            level=item.level,
            overall=None,
            score=None,
            indicators=None,
            units=None,
            hint_id="retry_quiet",
            visuals=_visuals(item, variant),
            scorer=scorer,
            engine_version=engine_version,
            processing_ms=processing_ms,
        )

    has_lips = item.level != 0
    units: list[UnitResult] = []
    hint_id = "ok_good"
    last = len(item.units) - 1
    timings = _unit_timings(item)
    for index, (unit, (start_ms, end_ms)) in enumerate(zip(item.units, timings, strict=True)):
        bibir: Status | None = "hijau" if has_lips else None
        suara: Status = "hijau"
        reason: ReasonCode | None = None
        if variant != "hijau" and index == last:
            indicator, reason, hint_id = _problem_for(item, unit)
            if indicator == "bibir":
                bibir = variant
            else:
                suara = variant
        status = worst([s for s in (bibir, suara) if s is not None])
        units.append(
            UnitResult(
                index=index,
                target=unit,
                start_ms=start_ms,
                end_ms=end_ms,
                bibir=bibir,
                suara=suara,
                status=status,
                reason_code=reason,
            )
        )

    statuses = [u.status for u in units]
    return AnalyzeResponse(
        status="ok",
        quality_flags=[],
        item_id=item.item_id,
        level=item.level,
        overall=worst(statuses),
        score=score_of(statuses),
        indicators=Indicators(
            bibir=worst([u.bibir for u in units if u.bibir is not None]) if has_lips else None,
            suara=worst([u.suara for u in units]),
        ),
        units=units,
        hint_id=hint_id,
        visuals=_visuals(item, variant),
        scorer=scorer,
        engine_version=engine_version,
        processing_ms=processing_ms,
    )


def build_calibrate_mock(
    step: CalibrationStep, variant: MockVariant, engine_version: str
) -> CalibrateResponse:
    if variant == "retry":
        return CalibrateResponse(
            status="retry",
            step=step,
            quality_flags=["no_face"],
            saved=False,
            calibration_complete=False,
            engine_version=engine_version,
        )
    return CalibrateResponse(
        status="ok",
        step=step,
        quality_flags=[],
        saved=True,
        calibration_complete=step == "vowel_u",
        engine_version=engine_version,
    )
