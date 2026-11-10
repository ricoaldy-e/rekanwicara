"""Segmentation (SPEC §6.6) on synthetic series."""

from app.core.thresholds import load_thresholds
from app.pipeline.segment import find_closures, segment_units
from tests import synth

T = load_thresholds()
FRAME_MS = 1000 / T.media.fps


def test_closures_ignore_rest_after_the_word_and_clip_the_word_initial_one() -> None:
    lips, voice, region = synth.mama()
    closures = find_closures(lips, voice, region, T.segment, FRAME_MS)
    assert len(closures) == 2  # the closed lips after 1250 ms never open again: not counted
    first, second = closures
    assert first.start_ms == 300  # starts at the speech region, not at the clip start (rest)
    assert first.voiced_ratio == 1.0  # the /m/ hum
    assert 800 <= second.start_ms < second.release_ms <= 1000
    assert second.closure_ms >= T.segment.closure_min_ms


def test_closure_voicing_is_measured_inside_the_closure() -> None:
    lips, voice, region = synth.mama(second_closure_voiced=False)
    second = find_closures(lips, voice, region, T.segment, FRAME_MS)[1]
    assert second.voiced_ratio < 0.3
    assert second.closure_db < 40


def test_vowel_initial_word_drops_the_opening_from_rest() -> None:
    """apa: rest (closed) | a | p closure | a."""
    lips = synth.lips(1800, [(300, 600, synth.OPEN), (750, 1100, synth.OPEN)])
    voice = synth.voice(1800, [(300, 600), (750, 1100)])
    region = (300.0, 1100.0)
    closures = find_closures(lips, voice, region, T.segment, FRAME_MS)
    spans = segment_units(["a", "pa"], closures, voice, region, T.segment)
    assert spans[0].closure is None and spans[0].start_ms == 300
    assert spans[1].closure is not None
    assert 600 <= spans[1].start_ms <= 750  # boundary at the start of the /p/ closure
    # Release at the midpoint of the last closed (733) and first open (800) frame: at most a few
    # 10 ms frames of the following vowel fall inside, so a silent /p/ stays below 0.3.
    assert 733 < spans[1].closure.release_ms < 800
    assert spans[1].closure.voiced_ratio < 0.3


def test_missing_closure_falls_back_to_valleys() -> None:
    """mama without the second closure: one consonant gets no closure (§6.6.5)."""
    lips = synth.lips(2000, [(500, 1250, synth.OPEN)])
    voice = synth.voice(2000, [(300, 1250)], loud=[(850, 900, 55.0)])  # a dip between the two "ma"
    region = (300.0, 1250.0)
    closures = find_closures(lips, voice, region, T.segment, FRAME_MS)
    spans = segment_units(["ma", "ma"], closures, voice, region, T.segment)
    assert len(spans) == 2
    assert spans[0].closure is not None and spans[1].closure is None
    assert 850 <= spans[1].start_ms < 900  # the intensity valley
