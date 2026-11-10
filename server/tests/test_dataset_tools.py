"""LOSO folds, the dataset report and clip processing (A4)."""

import json
from collections.abc import Callable
from pathlib import Path

import numpy as np
import pytest

from app.content.loader import load_content
from app.core.thresholds import load_thresholds
from app.dataset import report
from app.dataset.folds import loso_folds, write_folds
from app.dataset.labels import LabelStore, all_labels
from app.dataset.process import is_processed, process_clip, thresholds_sha
from tests.conftest import AUDIO_TONE
from tests.dataset_helpers import ROWS, clip_id, make_dataset

CONTENT = load_content()
HEARD = [i.item_id for i in CONTENT.active_items]


@pytest.fixture
def data(tmp_path: Path, sample_video: bytes) -> tuple[Path, list[dict[str, str]]]:
    return tmp_path, make_dataset(tmp_path, sample_video)


def label(
    store: LabelStore,
    annotator: str,
    row_index: int,
    matches: bool,
    lips: bool = False,
    ok: bool = True,
) -> None:
    store.save(
        annotator,
        clip_id(ROWS[row_index]),
        matches_request=matches,
        heard_label="",
        lips_wrong=lips,
        quality_ok=ok,
        notes="",
        known_heard_labels=HEARD,
    )


# ---------- folds (SPEC §10.6) ----------


def test_loso_every_speaker_is_the_test_speaker_once(data) -> None:
    _, meta = data
    folds = loso_folds(meta)
    assert [f["test_speaker"] for f in folds] == ["P1", "P2", "P3"]
    everything = {r["clip_id"] for r in meta}
    for f in folds:
        test, tune = set(f["test_clips"]), set(f["tune_clips"])  # type: ignore[arg-type]
        assert not (test & tune)  # a speaker is never in both sets
        assert test | tune == everything
        assert {r["speaker_id"] for r in meta if r["clip_id"] in test} == {f["test_speaker"]}
        assert f["test_speaker"] not in f["tune_speakers"]


def test_write_folds_files(data) -> None:
    root, meta = data
    paths = write_folds(meta, root / "splits")
    assert [p.name for p in paths] == ["fold_1.json", "fold_2.json", "fold_3.json"]
    fold2 = json.loads(paths[1].read_text(encoding="utf-8"))
    assert fold2["fold"] == 2 and fold2["test_speaker"] == "P2" and len(fold2["tune_clips"]) == 4


# ---------- report ----------


def test_counts_per_speaker_and_item(data) -> None:
    _, meta = data
    per_speaker, per_item = report.counts(meta)
    assert dict(per_speaker) == {"P1": 2, "P2": 2, "P3": 2}
    assert dict(per_item["l1_a"]) == {"P1": 1, "P2": 1, "P3": 1}
    assert sum(per_item["l3_mama"].values()) == 2


def test_unchecked_lists_what_each_annotator_still_has_to_do(data) -> None:
    root, meta = data
    store = LabelStore(root)
    label(store, "P2", 0, True)  # P2 checks one of P1's clips
    todo = report.unchecked(meta, all_labels(root))
    assert len(todo["P1"]) == 4 and len(todo["P2"]) == 3 and len(todo["P3"]) == 4
    assert clip_id(ROWS[0]) not in todo["P2"] and clip_id(ROWS[0]) in todo["P3"]


def test_agreement_per_pair_and_pooled(data) -> None:
    root, meta = data
    store = LabelStore(root)
    # P2 and P3 both check P1's four... only two P1 clips exist: rows 0 and 1.
    label(store, "P2", 0, True)
    label(store, "P3", 0, True)
    label(store, "P2", 1, False)
    label(store, "P3", 1, True)
    rows = report.agreement(meta, all_labels(root))
    match = next(r for r in rows if r["pair"] == "P2-P3" and r["field"] == "sesuai materi")
    assert match["n"] == 2 and match["percent"] == 0.5
    assert match["kappa"] == pytest.approx(0.0)  # observed 0.5 equals chance 0.5
    assert next(r for r in rows if r["pair"] == "semua" and r["field"] == "sesuai materi")["n"] == 2
    lips = next(r for r in rows if r["pair"] == "P2-P3" and r["field"] == "bibir salah")
    assert lips["percent"] == 1.0 and lips["kappa"] is None  # nobody ticked it: kappa undefined


def test_agreement_without_any_pair_is_n_a(data) -> None:
    _, meta = data
    rows = report.agreement(meta, {})
    assert rows and all(r["n"] == 0 and r["percent"] is None and r["kappa"] is None for r in rows)


def test_review_list_flags_doubtful_labels(data) -> None:
    root, meta = data
    store = LabelStore(root)
    label(store, "P2", 0, False)  # P1 "none" clip judged not matching by P2
    label(store, "P3", 0, True)  # ... and matching by P3 -> disagreement too
    label(store, "P2", 1, True)  # P1 mama_as_papa: both say it matches and lips fine
    label(store, "P3", 1, True)
    review = dict()
    for cid, reason in report.review_list(meta, all_labels(root)):
        review.setdefault(cid, []).append(reason)
    assert any("tidak sesuai" in r for r in review[clip_id(ROWS[0])])
    assert any("berbeda pendapat" in r for r in review[clip_id(ROWS[0])])
    assert any("tidak terlihat" in r for r in review[clip_id(ROWS[1])])
    assert clip_id(ROWS[2]) not in review


def test_a_visible_error_is_not_flagged(data) -> None:
    root, meta = data
    store = LabelStore(root)
    label(store, "P2", 1, False, lips=True)
    label(store, "P3", 1, False, lips=True)
    assert report.review_list(meta, all_labels(root)) == []


def test_render_has_every_section(data) -> None:
    root, _ = data
    text = report.render(root)
    for heading in (
        "Klip per orang",
        "Klip per materi",
        "Pemrosesan",
        "Cek label",
        "Kesepakatan antar-annotator",
        "Klip yang perlu ditinjau",
    ):
        assert heading in text
    assert "Klip tercatat: **6**" in text and "Belum diproses: 6" in text


def test_render_on_an_empty_data_dir(tmp_path: Path) -> None:
    assert "Klip tercatat: **0**" in report.render(tmp_path)


# ---------- processing ----------


def test_processing_status_tells_done_stale_and_missing(data) -> None:
    root, meta = data
    out = root / "processed"
    out.mkdir()
    done, stale = meta[0]["clip_id"], meta[1]["clip_id"]
    for cid, sha in ((done, thresholds_sha()), (stale, "old")):
        (out / f"{cid}.json").write_text(json.dumps({"thresholds_sha": sha}), encoding="utf-8")
        (out / f"{cid}.npz").write_bytes(b"x")
    status = report.processing_status(meta, out)
    assert status["done"] == [done] and status["stale"] == [stale] and len(status["missing"]) == 4


def test_failures_file_is_read_and_tolerates_garbage(tmp_path: Path) -> None:
    assert report.failures(tmp_path) == []
    (tmp_path / "_failures.json").write_text("not json", encoding="utf-8")
    assert report.failures(tmp_path) == []
    (tmp_path / "_failures.json").write_text(
        json.dumps([{"clip_id": "a", "error": "boom"}]), encoding="utf-8"
    )
    assert report.failures(tmp_path)[0]["error"] == "boom"


@pytest.mark.requires_model
def test_process_clip_writes_json_and_series_and_goes_stale_with_new_thresholds(
    tmp_path: Path, make_clip: Callable[..., Path], face_model: Path
) -> None:
    video = make_clip(audio=AUDIO_TONE)  # a clip without a face: the quality check must say retry
    row = {
        "clip_id": "P1__l1_a__r1__none__quiet",
        "speaker_id": "P1",
        "item_id": "l1_a",
        "intended_error": "none",
        "condition": "quiet",
    }
    out = tmp_path / "processed"
    summary = process_clip(video, row, CONTENT, load_thresholds(), face_model, out)

    assert summary["status"] == "retry" and "no_face" in summary["quality_flags"]  # type: ignore[operator]
    assert summary["hint_id"] == "retry_no_face" and summary["units"] is None
    saved = json.loads((out / f"{row['clip_id']}.json").read_text(encoding="utf-8"))
    assert saved["thresholds_sha"] == thresholds_sha() and saved["intended_error"] == "none"
    series = np.load(out / f"{row['clip_id']}.npz")
    assert {"lip_t_ms", "lip_closed", "voice_t_ms", "voice_f1_hz"} <= set(series.files)
    assert len(series["lip_t_ms"]) == len(series["lip_gap_ratio"]) > 0

    assert is_processed(out, row["clip_id"])
    saved["thresholds_sha"] = "other"
    (out / f"{row['clip_id']}.json").write_text(json.dumps(saved), encoding="utf-8")
    assert not is_processed(out, row["clip_id"])  # thresholds changed: process it again
    assert not list(out.glob(".*"))  # no temp files left behind
