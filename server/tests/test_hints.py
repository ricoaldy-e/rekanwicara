"""Hint choice (SPEC §6.9)."""

from app.content.loader import load_content
from app.pipeline.hints import RETRY_HINTS, pick_hint, retry_hint, unit_hint
from app.pipeline.rules import UnitScore

HINTS = load_content().hints


def unit(target: str, status: str, reason: str | None, index: int = 0) -> UnitScore:
    return UnitScore(index, target, 0, 1, "hijau", status, status, reason, None)  # type: ignore[arg-type]


def test_retry_hint_follows_the_flag_order() -> None:
    assert retry_hint(["too_short", "no_face"]) == "retry_no_face"
    assert retry_hint(["uncalibrated"]) is None
    assert retry_hint([]) is None
    assert set(RETRY_HINTS.values()) <= HINTS.keys()


def test_red_unit_before_yellow_unit() -> None:
    units = [
        unit("ma", "kuning", "closure_voicing_expected", 0),
        unit("pa", "merah", "closure_voicing_unexpected", 1),
    ]
    assert pick_hint(units) == "p_silent"


def test_all_green_is_ok_good() -> None:
    assert pick_hint([unit("a", "hijau", None)]) == "ok_good"


def test_reason_mapping() -> None:
    assert unit_hint(unit("bi", "merah", "closure_voicing_expected")) == "b_voicing"
    assert unit_hint(unit("ma", "merah", "closure_voicing_expected")) == "m_voicing"
    assert unit_hint(unit("u", "merah", "vowel_acoustic_mismatch")) == "u_round"
    assert unit_hint(unit("m_hum", "merah", "hum_open")) == "closure_missing"
    assert unit_hint(unit("m_hum", "merah", "hum_short")) == "m_voicing"
    assert unit_hint(unit("a", "merah", "l0_duration_short")) == "l0_duration_short"
