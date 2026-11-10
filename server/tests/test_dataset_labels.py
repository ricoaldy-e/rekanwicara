"""Automatic labels (SPEC §10.3), human label files (§10.5) and agreement statistics."""

import csv
from pathlib import Path

import pytest

from app.content.loader import load_content
from app.dataset.labels import (
    AUTO_LABEL_COLUMNS,
    LABEL_COLUMNS,
    LabelError,
    LabelStore,
    auto_label,
    cohens_kappa,
    percent_agreement,
    write_auto_labels,
)
from tests.dataset_helpers import ROWS, clip_id, make_dataset

CONTENT = load_content()
ITEMS = CONTENT.items_by_id
HEARD = [i.item_id for i in CONTENT.active_items]


def meta(speaker: str, item: str, error: str) -> dict[str, str]:
    return {
        "clip_id": f"{speaker}__{item}__r1__{error}__quiet",
        "speaker_id": speaker,
        "item_id": item,
        "intended_error": error,
        "condition": "quiet",
    }


@pytest.mark.parametrize(
    ("item", "error", "outcome", "u1", "u2"),
    [
        ("l3_mama", "none", "scored", ("ok", "ok"), ("ok", "ok")),
        (
            "l3_mama",
            "mama_as_papa",
            "scored",
            ("ok", "salah"),
            ("ok", "salah"),
        ),  # bibir ok, suara salah
        (
            "l3_mama",
            "mama_no_closure",
            "scored",
            ("salah", ""),
            ("salah", ""),
        ),  # SPEC names only the lips
        ("l1_u", "u_flat_lips", "scored", ("salah", ""), ("", "")),  # unit 1 only
        ("l1_a", "a_narrow", "scored", ("salah", ""), ("", "")),
        ("l3_mama", "bad_face", "retry", ("", ""), ("", "")),
        ("l1_a", "bad_noise", "retry_or_scored", ("", ""), ("", "")),
    ],
)
def test_auto_label_follows_spec_10_3(item, error, outcome, u1, u2) -> None:
    label = auto_label(meta("P1", item, error), ITEMS[item])
    assert label["expected_outcome"] == outcome
    assert (label["u1_bibir"], label["u1_suara"]) == u1
    if len(ITEMS[item].units) > 1:
        assert (label["u2_bibir"], label["u2_suara"]) == u2
    assert label["n_units"] == len(ITEMS[item].units)


def test_level_0_has_no_lip_label() -> None:
    label = auto_label(meta("P1", "l0_hold_a", "none"), ITEMS["l0_hold_a"])
    assert (label["u1_bibir"], label["u1_suara"]) == ("n/a", "ok")


def test_write_auto_labels(tmp_path: Path, sample_video: bytes) -> None:
    make_dataset(tmp_path, sample_video)
    out = tmp_path / "labels" / "auto_labels.csv"
    assert write_auto_labels(tmp_path / "raw", ITEMS, out) == len(ROWS)
    with out.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert tuple(rows[0]) == AUTO_LABEL_COLUMNS
    assert {r["clip_id"] for r in rows} == {clip_id(r) for r in ROWS}


def test_write_auto_labels_without_recordings(tmp_path: Path) -> None:
    assert write_auto_labels(tmp_path / "raw", ITEMS, tmp_path / "labels" / "auto.csv") == 0


# ---------- LabelStore ----------


def save(store: LabelStore, annotator: str, cid: str, **over) -> None:
    args = dict(matches_request=True, heard_label="", lips_wrong=False, quality_ok=True, notes="")
    store.save(annotator, cid, known_heard_labels=HEARD, **{**args, **over})


@pytest.fixture
def store(tmp_path: Path, sample_video: bytes) -> LabelStore:
    make_dataset(tmp_path, sample_video)
    return LabelStore(tmp_path)


def test_save_writes_spec_columns_and_upserts(store: LabelStore) -> None:
    cid = clip_id(ROWS[0])  # recorded by P1
    save(store, "P2", cid, matches_request=True, heard_label="l1_a", notes="ok")
    save(store, "P2", cid, matches_request=False, lips_wrong=True, notes="bibir\ntertutup")
    with store.path("P2").open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert tuple(rows[0]) == LABEL_COLUMNS
    assert len(rows) == 1  # re-labelling replaces, never duplicates
    assert (rows[0]["matches_request"], rows[0]["lips_wrong"], rows[0]["quality_ok"]) == (
        "0",
        "1",
        "1",
    )
    assert rows[0]["notes"] == "bibir tertutup"  # a newline would break the CSV row
    assert store.load("P2")[cid]["annotator"] == "P2"


def test_two_annotators_keep_separate_files(store: LabelStore) -> None:
    cid = clip_id(ROWS[0])
    save(store, "P2", cid)
    save(store, "P3", cid, matches_request=False)
    assert store.load("P2")[cid]["matches_request"] == "1"
    assert store.load("P3")[cid]["matches_request"] == "0"


@pytest.mark.parametrize(
    ("annotator", "clip", "over", "code"),
    [
        ("P1", clip_id(ROWS[0]), {}, "own_clip"),  # P1 recorded it
        ("P9", clip_id(ROWS[0]), {}, "invalid_annotator"),
        ("P2", "P1__nope__r1__none__quiet", {}, "unknown_clip"),
        ("P2", clip_id(ROWS[0]), {"heard_label": "l9_zzz"}, "invalid_heard_label"),
        ("P2", clip_id(ROWS[0]), {"notes": "x" * 201}, "notes_too_long"),
    ],
)
def test_save_rejects_bad_labels(store: LabelStore, annotator, clip, over, code) -> None:
    with pytest.raises(LabelError) as err:
        save(store, annotator, clip, **over)
    assert err.value.code == code
    assert not store.path(annotator).exists()  # nothing written


def test_unclear_is_a_valid_heard_label(store: LabelStore) -> None:
    save(store, "P2", clip_id(ROWS[0]), heard_label="unclear")
    assert store.load("P2")[clip_id(ROWS[0])]["heard_label"] == "unclear"


def test_load_without_a_file_is_empty(tmp_path: Path) -> None:
    assert LabelStore(tmp_path).load("P1") == {}


# ---------- agreement ----------


def test_kappa_known_values() -> None:
    a = [1, 1, 0, 0, 1, 0, 1, 0]
    b = [1, 0, 0, 0, 1, 1, 1, 0]  # 6/8 agree; chance agreement 0.5 -> kappa 0.5
    assert percent_agreement(a, b) == 0.75
    assert cohens_kappa(a, b) == pytest.approx(0.5)
    assert cohens_kappa(a, a) == 1.0
    assert cohens_kappa([1, 0], [0, 1]) == -1.0


def test_kappa_is_undefined_without_variation_or_pairs() -> None:
    assert cohens_kappa([1, 1, 1], [1, 1, 1]) is None  # chance agreement is 1
    assert cohens_kappa([], []) is None
    assert percent_agreement([], []) is None
    assert percent_agreement([1], [1, 0]) is None
