"""A6 evaluation (SPEC §10.6, §11) on synthetic clips: truth, metrics, tuning, YAML update."""

import pytest

from app.core.thresholds import THRESHOLDS_PATH, Thresholds, load_thresholds
from app.dataset import evaluation as ev
from app.pipeline.calibration import anchors as default_anchors
from tests import synth

T = load_thresholds()
ANCHORS = default_anchors(None, T)


def human(matches: str, lips_wrong: str = "0", quality_ok: str = "1") -> dict[str, str]:
    return {"matches_request": matches, "lips_wrong": lips_wrong, "quality_ok": quality_ok}


def mama_clip(cid: str, error: str = "none", voiced: bool = True, humans=None) -> ev.Clip:
    lips, voice, region = synth.mama(second_closure_voiced=voiced)
    return ev.Clip(
        clip_id=cid, speaker="P1", item_id="l3_mama", error=error, level=3, units=["ma", "ma"],
        retry=False, region=region, total_ms=800, lips=lips, voice=voice,
        humans=humans if humans is not None else [human("1"), human("1")],
    )  # fmt: skip


def vowel_clip(
    cid: str, jaw: float, error: str = "none", humans=None, speaker: str = "P1"
) -> ev.Clip:
    lips = synth.lips(1500, [(300, 900, {"gap": 0.3, "jaw": jaw})])
    voice = synth.voice(1500, [(300, 900)], f1=800, f2=1400)
    return ev.Clip(
        clip_id=cid, speaker=speaker, item_id="l1_a", error=error, level=1, units=["a"],
        retry=False, region=(300.0, 900.0), total_ms=700, lips=lips, voice=voice,
        humans=humans if humans is not None else [human("1"), human("1")],
    )  # fmt: skip


# ---------- truth ----------


def test_human_verdict() -> None:
    assert ev.human_verdict(mama_clip("a")) == "ok"
    assert ev.human_verdict(mama_clip("b", humans=[human("0"), human("0")])) == "wrong"
    assert ev.human_verdict(mama_clip("c", humans=[human("1"), human("0")])) == "split"
    assert ev.human_verdict(mama_clip("d", humans=[human("1")])) is None


def test_an_intended_error_both_annotators_found_correct_was_not_performed() -> None:
    performed = mama_clip("a", "mama_as_papa", humans=[human("0"), human("1")])
    not_performed = mama_clip("b", "mama_as_papa", humans=[human("1"), human("1")])
    assert ev.effective_error(performed) == "mama_as_papa"
    assert ev.effective_error(not_performed) == "none"
    # Block G errors are never overridden: they are about the recording, not the speech.
    assert ev.effective_error(mama_clip("c", "bad_face")) == "bad_face"


# ---------- samples ----------


def test_consonant_samples_for_a_correct_and_a_silent_mama() -> None:
    closure, voicing = ev.consonant_samples(mama_clip("ok"), T)
    assert [(s.truth, s.machine) for s in closure] == [(True, True), (True, True)]
    assert all(s.truth and s.machine for s in voicing)

    # mama_as_papa really performed: the second closure is silent; truth says "not as the target".
    silent = mama_clip("as_papa", "mama_as_papa", voiced=False, humans=[human("0"), human("0")])
    _, voicing = ev.consonant_samples(silent, T)
    assert [s.truth for s in voicing] == [False, False]
    assert voicing[1].machine is False  # the silent closure fails the /m/ voicing check


def test_unusable_clips_give_no_unit_samples() -> None:
    rejected = mama_clip("x", humans=[human("0"), human("0")])  # wrong in an unknown way
    assert ev.consonant_samples(rejected, T) == ([], [])
    retry = mama_clip("y")
    retry.retry = True
    assert ev.consonant_samples(retry, T) == ([], [])
    assert ev.word_samples(mama_clip("g", "bad_face"), T, ANCHORS) == []


def test_word_samples_skip_split_votes_and_count_retry_as_not_green() -> None:
    assert ev.word_samples(mama_clip("s", humans=[human("1"), human("0")]), T, ANCHORS) == []
    retry = mama_clip("r")
    retry.retry = True
    [sample] = ev.word_samples(retry, T, ANCHORS)
    assert (sample.truth, sample.machine) == (True, False)
    [ok] = ev.word_samples(mama_clip("ok"), T, ANCHORS)
    assert (ok.truth, ok.machine) == (True, True)


def test_vowel_samples_use_the_unit_status() -> None:
    [wide] = ev.vowel_samples(vowel_clip("w", 0.5), T, ANCHORS)
    narrow = vowel_clip("n", 0.05, "a_narrow", humans=[human("0", "1"), human("0", "1")])
    [shut] = ev.vowel_samples(narrow, T, ANCHORS)
    assert (wide.truth, wide.machine) == (True, True)
    assert (shut.truth, shut.machine) == (False, False)


# ---------- scoring and tuning ----------


def test_score_counts_kappa_and_balanced_accuracy() -> None:
    items = [
        ev.Sample("c", t, m, "") for t, m in [(True, True)] * 8 + [(True, False), (False, False)]
    ]
    s = ev.score(items)
    assert (s.tp, s.fn, s.fp, s.tn) == (8, 1, 0, 1)
    assert s.text() == "9/10 = 90%"
    assert s.balanced == pytest.approx((8 / 9 + 1) / 2)
    assert ev.score([]).text() == "0/0"


def test_with_params_moves_the_linked_yellow_limits_and_leaves_the_source_alone() -> None:
    t = ev.with_params(
        T, {"rules.consonants.p.voiced_ratio_max": 0.5, "rules.consonants.b.voiced_ratio_min": 0.05}
    )
    assert t.rules.consonants.p.yellow_voiced_ratio_max == pytest.approx(0.6)
    assert t.rules.consonants.b.yellow_voiced_ratio_min == 0.0  # clamped at 0
    assert isinstance(t, Thresholds) and T.rules.consonants.p.voiced_ratio_max != 0.5


def test_tune_finds_a_threshold_that_separates_the_classes() -> None:
    """Correct "a" opens to 0.30, the narrow one to 0.05: 0.40 calls the correct one wrong."""
    clips = [vowel_clip("ok1", 0.30), vowel_clip("ok2", 0.31)] + [
        vowel_clip(f"bad{k}", 0.05, "a_narrow", humans=[human("0", "1"), human("0", "1")])
        for k in range(2)
    ]
    strict = ev.with_params(T, {"rules.vowels.a.jaw_open_min": 0.45})
    assert ev.score(ev.samples(clips, strict, ANCHORS, "vowel")).balanced < 1.0
    params = ev.tune(clips, strict, ANCHORS)
    tuned = ev.with_params(strict, params)
    assert ev.score(ev.samples(clips, tuned, ANCHORS, "vowel")).balanced == 1.0
    assert params["rules.vowels.a.jaw_open_min"] <= 0.30


def test_loso_never_tests_a_speaker_it_was_tuned_on() -> None:
    clips = [vowel_clip(f"{s}{k}", 0.5, speaker=s) for s in ("P1", "P2", "P3") for k in range(2)]
    folds = ev.run_loso(clips, T)
    assert [f.test_speaker for f in folds] == ["P1", "P2", "P3"]
    assert all(f.after["vowel"].n == 2 for f in folds)  # only the 2 clips of the test speaker


def test_k1_checks_and_latency() -> None:
    face = mama_clip("f", "bad_face")
    face.retry = True
    good = mama_clip("g")
    checks = ev.k1_checks([face, good])
    assert checks["bad_face_retry"] == (1, 1) and checks["good_rejected"] == (0, 1)
    assert ev.latency([face, good])["p90"] == 800


# ---------- thresholds.yaml ----------

YAML = """lips:
  closed_gap_ratio: 0.08     # §6.4 note
rules:
  m_hum:
    voiced_ratio_min: 0.70   # §6.7
  consonants:
    b:
      voiced_ratio_min: 0.5        # §6.7
    m:
      voiced_ratio_min: 0.5
defaults:
  vowel_anchors:
    a: {f1: 819.0, f2: 1410.0}
"""


def test_update_yaml_changes_only_the_named_paths_and_keeps_the_old_value() -> None:
    out = ev.update_yaml(
        YAML, {"rules.consonants.b.voiced_ratio_min": 0.3, "lips.closed_gap_ratio": 0.08}, "A6"
    )
    lines = out.splitlines()
    assert "      voiced_ratio_min: 0.3  # A6, sebelumnya 0.5; §6.7" in lines
    assert "    voiced_ratio_min: 0.70   # §6.7" in lines  # m_hum has the same key: untouched
    assert "      voiced_ratio_min: 0.5" in lines  # m untouched
    assert "  closed_gap_ratio: 0.08     # §6.4 note" in lines  # same value: line unchanged
    assert "    a: {f1: 819.0, f2: 1410.0}" in lines
    assert out.endswith("\n")


def test_the_real_thresholds_file_survives_a_no_op_update() -> None:
    text = THRESHOLDS_PATH.read_text(encoding="utf-8")
    current = {path: ev.get_param(T, path) for _, path, _ in ev.GRID}
    assert ev.update_yaml(text, ev.expand(current), "noop") == text
