"""Dataset labels (SPEC §10.3, §10.5): automatic labels, human label files, agreement statistics.

Lives in the server package because the /labeler page (server) writes the label files; the
scripts in ``ml/dataset`` import it. Everything here is local CSV on disk under DATA_DIR;
nothing leaves the laptop.
"""

from __future__ import annotations

import csv
import os
import threading
import uuid
from collections.abc import Iterable, Sequence
from pathlib import Path

from app.api.schemas import Item
from app.core.storage import SPEAKER_IDS

ANNOTATORS: tuple[str, ...] = tuple(sorted(SPEAKER_IDS))  # P1, P2, P3

# SPEC §10.5.
LABEL_COLUMNS = (
    "clip_id",
    "annotator",
    "matches_request",
    "heard_label",
    "lips_wrong",
    "quality_ok",
    "notes",
)
UNCLEAR = "unclear"  # heard_label when the annotator could not tell
MAX_NOTES = 200

AUTO_LABEL_COLUMNS = (
    "clip_id",
    "speaker_id",
    "item_id",
    "intended_error",
    "condition",
    "expected_outcome",
    "n_units",
    "u1_bibir",
    "u1_suara",
    "u2_bibir",
    "u2_suara",
)


class LabelError(ValueError):
    """A label that must not be saved. ``code`` is machine readable, the message is for people."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


# ---------- metadata ----------


def read_metadata(raw_dir: Path) -> list[dict[str, str]]:
    """Rows of data/raw/metadata.csv; empty when no clip has been recorded yet."""
    path = raw_dir / "metadata.csv"
    if not path.is_file():
        return []
    with path.open(newline="", encoding="utf-8") as fh:
        return [row for row in csv.DictReader(fh) if row.get("clip_id")]


def clip_path(raw_dir: Path, row: dict[str, str]) -> Path:
    """SPEC §5 storage path of a clip; every part comes from validated metadata."""
    name = f"{row['item_id']}__r{row['rep']}__{row['intended_error']}__{row['condition']}.mp4"
    return raw_dir / row["speaker_id"] / name


# ---------- automatic labels (SPEC §10.3) ----------

# intended_error -> (expected_outcome, per-unit bibir, per-unit suara, which units).
# "" = SPEC says nothing about it, so it is not guessed.
_BOTH = "both"
_FIRST = "first"
_AUTO_RULES: dict[str, tuple[str, str, str, str]] = {
    # error:            outcome,            bibir,  suara, which units
    "none": ("scored", "ok", "ok", _BOTH),
    "mama_as_papa": ("scored", "ok", "salah", _BOTH),
    "u_flat_lips": ("scored", "salah", "", _FIRST),
    "a_narrow": ("scored", "salah", "", _FIRST),
    "mama_no_closure": ("scored", "salah", "", _BOTH),
    "bad_face": ("retry", "", "", _BOTH),  # must be retry: no_face / face_off_frame
    "bad_noise": ("retry_or_scored", "", "", _BOTH),  # retry (too_noisy) or still scored
}


def auto_label(row: dict[str, str], item: Item) -> dict[str, str | int]:
    """Automatic label of one clip from its metadata row and item (SPEC §10.3)."""
    outcome, bibir, suara, which = _AUTO_RULES[row["intended_error"]]
    out: dict[str, str | int] = {
        "clip_id": row["clip_id"],
        "speaker_id": row["speaker_id"],
        "item_id": row["item_id"],
        "intended_error": row["intended_error"],
        "condition": row["condition"],
        "expected_outcome": outcome,
        "n_units": len(item.units),
        "u1_bibir": "",
        "u1_suara": "",
        "u2_bibir": "",
        "u2_suara": "",
    }
    for index in range(min(len(item.units), 2)):
        if which == _FIRST and index > 0:
            # "unit 1: bibir salah": the other units are not mentioned by SPEC, so they stay empty.
            continue
        out[f"u{index + 1}_bibir"] = "n/a" if item.level == 0 else bibir
        out[f"u{index + 1}_suara"] = suara
    return out


def write_auto_labels(raw_dir: Path, items: dict[str, Item], out_csv: Path) -> int:
    """Writes data/labels/auto_labels.csv for every recorded clip. Returns the number of rows."""
    rows = []
    for meta in read_metadata(raw_dir):
        item = items.get(meta["item_id"])
        if item is not None and meta["intended_error"] in _AUTO_RULES:
            rows.append(auto_label(meta, item))
    _write_csv_atomic(out_csv, AUTO_LABEL_COLUMNS, rows)
    return len(rows)


# ---------- human labels (SPEC §10.5) ----------


def _write_csv_atomic(
    path: Path, columns: Sequence[str], rows: Iterable[dict[str, object]]
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{uuid.uuid4().hex}.part")
    try:
        with tmp.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


class LabelStore:
    """``labels_{annotator}.csv`` files. A clip is labelled by someone else than its speaker."""

    def __init__(self, data_dir: Path) -> None:
        self.raw_dir = data_dir / "raw"
        self.labels_dir = data_dir / "labels"
        self._lock = threading.Lock()

    def path(self, annotator: str) -> Path:
        return self.labels_dir / f"labels_{annotator}.csv"

    def load(self, annotator: str) -> dict[str, dict[str, str]]:
        """clip_id -> stored row (raw strings)."""
        path = self.path(annotator)
        if not path.is_file():
            return {}
        with path.open(newline="", encoding="utf-8") as fh:
            return {r["clip_id"]: r for r in csv.DictReader(fh) if r.get("clip_id")}

    def save(
        self,
        annotator: str,
        clip_id: str,
        *,
        matches_request: bool,
        heard_label: str,
        lips_wrong: bool,
        quality_ok: bool,
        notes: str,
        known_heard_labels: Iterable[str],
    ) -> None:
        if annotator not in ANNOTATORS:
            raise LabelError("invalid_annotator", "Annotator harus P1, P2, atau P3.")
        speaker = next(
            (r["speaker_id"] for r in read_metadata(self.raw_dir) if r["clip_id"] == clip_id), None
        )
        if speaker is None:
            raise LabelError("unknown_clip", "Klip tidak dikenal.")
        if speaker == annotator:
            raise LabelError("own_clip", "Klip sendiri tidak boleh dinilai.")
        if heard_label and heard_label != UNCLEAR and heard_label not in set(known_heard_labels):
            raise LabelError("invalid_heard_label", "Pilihan bunyi yang didengar tidak dikenal.")
        if len(notes) > MAX_NOTES:
            raise LabelError("notes_too_long", f"Catatan maksimal {MAX_NOTES} karakter.")

        row = {
            "clip_id": clip_id,
            "annotator": annotator,
            "matches_request": int(matches_request),
            "heard_label": heard_label,
            "lips_wrong": int(lips_wrong),
            "quality_ok": int(quality_ok),
            "notes": notes.replace("\r", " ").replace("\n", " ").strip(),
        }
        with self._lock:  # read-modify-write of one small file
            rows = self.load(annotator)
            rows[clip_id] = {k: str(v) for k, v in row.items()}
            _write_csv_atomic(self.path(annotator), LABEL_COLUMNS, rows.values())


def all_labels(data_dir: Path) -> dict[str, dict[str, dict[str, str]]]:
    """annotator -> clip_id -> row, for the annotators that have a label file."""
    store = LabelStore(data_dir)
    return {a: store.load(a) for a in ANNOTATORS if store.path(a).is_file()}


# ---------- agreement ----------


def percent_agreement(a: Sequence[object], b: Sequence[object]) -> float | None:
    if not a or len(a) != len(b):
        return None
    return sum(x == y for x, y in zip(a, b, strict=True)) / len(a)


def cohens_kappa(a: Sequence[object], b: Sequence[object]) -> float | None:
    """Cohen's kappa for two raters. None when undefined: no pairs, or chance agreement is 1."""
    n = len(a)
    if n == 0 or n != len(b):
        return None
    observed = sum(x == y for x, y in zip(a, b, strict=True)) / n
    categories = set(a) | set(b)
    expected = sum((a.count(c) / n) * (b.count(c) / n) for c in categories)
    if expected >= 1.0:
        return None
    return (observed - expected) / (1 - expected)


__all__ = [
    "ANNOTATORS",
    "AUTO_LABEL_COLUMNS",
    "LABEL_COLUMNS",
    "UNCLEAR",
    "LabelError",
    "LabelStore",
    "all_labels",
    "auto_label",
    "clip_path",
    "cohens_kappa",
    "percent_agreement",
    "read_metadata",
    "write_auto_labels",
]
