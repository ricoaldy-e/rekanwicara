"""Scoring rules (SPEC §6.7-§6.8) on synthetic series: each table row in hijau, kuning, merah."""

import pytest

from app.core.thresholds import load_thresholds
from app.pipeline.calibration import anchors
from app.pipeline.hints import pick_hint
from app.pipeline.rules import at_least, at_most, score_item, score_of, worst
from tests import synth

T = load_thresholds()
ANCHORS = anchors(None, T)  # §6.3 defaults: a (819, 1410), i (310, 2521), u (416, 931)


def _vowel(vowel: str, lip: dict[str, float], f1: float, f2: float):
    lips = synth.lips(1500, [(300, 900, {"gap": 0.3, **lip})])
    voice = synth.voice(1500, [(300, 900)], f1=f1, f2=f2)
    return score_item(f"l1_{vowel}", [vowel], lips, voice, (300.0, 900.0), ANCHORS, T).units[0]


@pytest.mark.parametrize(
    ("vowel", "lip", "expected"),
    [
        ("a", {"jaw": 0.5}, "hijau"),
        ("a", {"jaw": 0.36}, "kuning"),  # within 15% below 0.40
        ("a", {"jaw": 0.2}, "merah"),
        ("i", {"width": 1.2, "round": 0.0}, "hijau"),
        ("i", {"width": 0.95, "round": 0.0}, "kuning"),
        ("i", {"width": 1.2, "round": 0.5}, "merah"),
        ("u", {"round": 0.6, "width": 0.8}, "hijau"),
        ("u", {"round": 0.31, "width": 0.8}, "kuning"),
        ("u", {"round": 0.6, "width": 1.2}, "merah"),
    ],
)
def test_vowel_lips(vowel: str, lip: dict[str, float], expected: str) -> None:
    f1, f2 = {"a": (800, 1400), "i": (300, 2400), "u": (400, 900)}[vowel]
    unit = _vowel(vowel, lip, f1, f2)
    assert (unit.bibir, unit.suara) == (expected, "hijau")
    reason = {"a": "vowel_open_low", "i": "vowel_spread_low", "u": "vowel_round_low"}[vowel]
    assert unit.reason_code == (None if expected == "hijau" else reason)


@pytest.mark.parametrize(
    ("vowel", "f1", "f2", "expected"),
    [
        ("a", 800, 1400, "hijau"),  # F1 >= max(F1_i, F1_u) + 100 = 516
        ("a", 470, 1400, "kuning"),
        ("a", 300, 1400, "merah"),
        ("i", 300, 2400, "hijau"),  # F2 >= F2_u + 300 = 1231
        ("i", 300, 1100, "kuning"),
        ("i", 300, 900, "merah"),
        ("u", 400, 900, "hijau"),  # F2 <= F2_i - 300 = 2221
        ("u", 400, 2400, "kuning"),
        ("u", 400, 2700, "merah"),
    ],
)
def test_vowel_voice_relative_to_anchors(vowel: str, f1: float, f2: float, expected: str) -> None:
    lip = {"a": {"jaw": 0.5}, "i": {"width": 1.2}, "u": {"round": 0.6, "width": 0.8}}[vowel]
    unit = _vowel(vowel, lip, f1, f2)
    assert (unit.bibir, unit.suara) == ("hijau", expected)
    assert unit.reason_code == (None if expected == "hijau" else "vowel_acoustic_mismatch")
    assert unit.formants == (f1, f2)


def _hum(lip_spans, voiced, region=(300.0, 1300.0)):
    lips, voice = synth.lips(1600, lip_spans), synth.voice(1600, voiced)
    return score_item("l1_m", ["m_hum"], lips, voice, region, ANCHORS, T).units[0]


def test_m_hum() -> None:
    ok = _hum([], [(300, 1300)])
    assert (ok.bibir, ok.suara, ok.reason_code) == ("hijau", "hijau", None)
    opened = _hum([(300, 1300, {"gap": 0.3})], [(300, 1300)])
    assert (opened.bibir, opened.reason_code) == ("merah", "hum_open")
    partly = _hum([(1050, 1300, {"gap": 0.3})], [(300, 1300)])  # closed 11 of 15 frames (0.73)
    assert partly.bibir == "kuning"
    weak = _hum([], [(300, 900)])  # voiced 60% of the region
    assert (weak.suara, weak.reason_code) == ("kuning", "hum_short")
    short = _hum([], [(300, 600)], region=(300.0, 600.0))  # 0.3 s < 0.5 s
    assert short.suara == "merah"


def _syllable(consonant: str, voiced_hold_ms: int, lips_close: bool = True):
    """Closure until 500 ms (last closed frame 467, first open 533: release 500), vowel 'a' after;
    the speech region starts at 300 ms, so the measured closure is 300-500 (20 voice frames) and
    ``voiced_hold_ms`` of it (from 300) is voiced."""
    spans = [(500, 900, synth.OPEN)] if lips_close else [(0, 900, synth.OPEN)]
    lips = synth.lips(1500, spans)
    voiced = [(533, 900)] + ([(300, 300 + voiced_hold_ms)] if voiced_hold_ms else [])
    voice = synth.voice(1500, voiced)
    item = f"l2_{consonant}a"
    return score_item(item, [f"{consonant}a"], lips, voice, (300.0, 900.0), ANCHORS, T).units[0]


@pytest.mark.parametrize(
    ("consonant", "hold_ms", "expected", "reason"),
    [
        ("p", 0, "hijau", None),  # voiced_ratio < 0.3
        ("p", 70, "kuning", "closure_voicing_unexpected"),  # 0.35: < 0.4
        ("p", 200, "merah", "closure_voicing_unexpected"),
        ("b", 200, "hijau", None),  # >= 0.5
        ("b", 85, "kuning", "closure_voicing_expected"),  # 0.45: >= 0.4
        ("b", 0, "merah", "closure_voicing_expected"),
        ("m", 200, "hijau", None),
        ("m", 90, "kuning", "closure_voicing_expected"),  # 0.45: within 15% of 0.5
        ("m", 0, "merah", "closure_voicing_expected"),
    ],
)
def test_consonant_voicing(consonant: str, hold_ms: int, expected: str, reason: str | None) -> None:
    unit = _syllable(consonant, hold_ms)
    assert (unit.bibir, unit.suara, unit.reason_code) == ("hijau", expected, reason)


def test_consonant_without_closure_is_closure_missing() -> None:
    unit = _syllable("b", 200, lips_close=False)
    assert (unit.bibir, unit.reason_code) == ("merah", "closure_missing")


def test_mama_with_silent_second_closure() -> None:
    """The A3 prompt's example: SPEC §6.8 gives 0.5 (hijau + merah) / 2, not 0.75."""
    lips, voice, region = synth.mama(second_closure_voiced=False)
    result = score_item("l3_mama", ["ma", "ma"], lips, voice, region, ANCHORS, T)
    first, second = result.units
    assert (first.status, second.status) == ("hijau", "merah")
    assert (second.bibir, second.suara, second.reason_code) == (
        "hijau",
        "merah",
        "closure_voicing_expected",
    )
    assert score_of(result.statuses) == 0.5
    assert worst(result.statuses) == "merah"
    assert pick_hint(result.units) == "m_voicing"


def test_mama_correct_is_all_green() -> None:
    lips, voice, region = synth.mama(second_closure_voiced=True)
    result = score_item("l3_mama", ["ma", "ma"], lips, voice, region, ANCHORS, T)
    assert result.statuses == ["hijau", "hijau"]
    assert [round(u.start_ms) for u in result.units] == [300, 800]  # boundary at closure 2 start
    assert result.vowel_point == (800.0, 1400.0)


@pytest.mark.parametrize(
    ("end_ms", "expected"), [(3500, "hijau"), (2900, "kuning"), (2000, "merah")]
)
def test_l0_hold_a(end_ms: int, expected: str) -> None:
    voice = synth.voice(4000, [(200, end_ms)])
    unit = score_item("l0_hold_a", ["a"], synth.lips(4000, []), voice, (0, 0), ANCHORS, T).units[0]
    assert unit.bibir is None and unit.suara == expected
    assert unit.reason_code == (None if expected == "hijau" else "l0_duration_short")


@pytest.mark.parametrize(("loud_db", "expected"), [(70, "hijau"), (65.5, "kuning"), (62, "merah")])
def test_l0_soft_loud(loud_db: float, expected: str) -> None:
    voice = synth.voice(
        4000, [(200, 1500), (1700, 3200)], loud=[(200, 1500, 60.0), (1700, 3200, loud_db)]
    )
    result = score_item("l0_soft_loud", ["a", "a"], synth.lips(4000, []), voice, (0, 0), ANCHORS, T)
    soft, loud = result.units
    assert soft.suara == "hijau" and loud.suara == expected
    assert 1500 <= loud.start_ms <= 1700  # split inside the pause
    assert all(u.bibir is None for u in result.units)


def test_yellow_band_helpers() -> None:
    assert at_least(0.40, 0.40, 0.15) == "hijau"
    assert at_least(0.34, 0.40, 0.15) == "kuning"
    assert at_least(0.33, 0.40, 0.15) == "merah"
    assert at_least(0.45, 0.5, 0.15, yellow=0.4) == "kuning"  # explicit SPEC yellow wins
    assert at_most(0.35, 0.3, 0.15, yellow=0.4) == "kuning"
    assert at_most(float("nan"), 0.3, 0.15) == "merah"
    assert score_of(["hijau", "kuning", "merah", "hijau"]) == 0.625
