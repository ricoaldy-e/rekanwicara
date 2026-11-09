"""On-disk storage for dataset clips and model videos (SPEC §5, §10).

Every path component comes from a whitelist (speaker ids, item ids, intended errors, conditions),
so user input can never escape DATA_DIR.
"""

import csv
import os
import threading
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import BinaryIO

# SPEC §10.1: the three team members who record.
SPEAKER_IDS = frozenset({"P1", "P2", "P3"})

# SPEC §10.3: intended error -> the only item it applies to (None = any item).
INTENDED_ERRORS: dict[str, str | None] = {
    "none": None,
    "mama_as_papa": "l3_mama",
    "u_flat_lips": "l1_u",
    "a_narrow": "l1_a",
    "mama_no_closure": "l3_mama",
    "bad_face": None,  # block G: face out of frame, any item
    "bad_noise": "l1_a",  # block G: say "a" with loud music/fan
}

# SPEC §10.5.
METADATA_COLUMNS = (
    "clip_id",
    "speaker_id",
    "item_id",
    "rep",
    "intended_error",
    "condition",
    "session_id",
    "recorded_at",
    "device",
)

_CHUNK = 1024 * 1024


class UploadTooLarge(Exception):
    pass


@dataclass(frozen=True)
class ClipMeta:
    speaker_id: str
    item_id: str
    rep: int
    intended_error: str
    condition: str
    session_id: str
    device: str = ""

    @property
    def clip_id(self) -> str:
        return (
            f"{self.speaker_id}__{self.item_id}__r{self.rep}"
            f"__{self.intended_error}__{self.condition}"
        )


def model_video_path(data_dir: Path, item_id: str) -> Path:
    return data_dir / "model_videos" / f"{item_id}.mp4"


def _write_atomic(src: BinaryIO, dest: Path, max_bytes: int) -> None:
    """Stream ``src`` to ``dest`` via a temp file; replaces ``dest`` only when complete."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(f".{dest.name}.{uuid.uuid4().hex}.part")
    try:
        src.seek(0)
        written = 0
        with tmp.open("wb") as out:
            while chunk := src.read(_CHUNK):
                written += len(chunk)
                if written > max_bytes:
                    raise UploadTooLarge
                out.write(chunk)
        os.replace(tmp, dest)
    finally:
        tmp.unlink(missing_ok=True)


class DatasetStore:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.raw_dir = data_dir / "raw"
        self.metadata_path = self.raw_dir / "metadata.csv"
        self._lock = threading.Lock()

    def clip_path(self, meta: ClipMeta) -> Path:
        # SPEC §5: raw/{speaker_id}/{item_id}__r{rep}__{intended_error}__{condition}.mp4
        name = f"{meta.item_id}__r{meta.rep}__{meta.intended_error}__{meta.condition}.mp4"
        return self.raw_dir / meta.speaker_id / name

    def save_clip(self, src: BinaryIO, meta: ClipMeta, max_bytes: int) -> str:
        """Save a dataset clip and upsert its metadata row.

        Re-recording the same clip (same speaker/item/rep/error/condition) replaces both the
        file and its row, so "ulang" during a session never leaves duplicates.
        """
        with self._lock:
            _write_atomic(src, self.clip_path(meta), max_bytes)
            self._upsert_metadata(meta)
        return meta.clip_id

    def save_model_video(self, src: BinaryIO, item_id: str, max_bytes: int) -> str:
        with self._lock:
            _write_atomic(src, model_video_path(self.data_dir, item_id), max_bytes)
        return f"model_video__{item_id}"

    def _upsert_metadata(self, meta: ClipMeta) -> None:
        rows: list[dict[str, str]] = []
        if self.metadata_path.exists():
            with self.metadata_path.open(newline="", encoding="utf-8") as fh:
                rows = [r for r in csv.DictReader(fh) if r.get("clip_id") != meta.clip_id]

        fields = asdict(meta)
        row = {
            "clip_id": meta.clip_id,
            **{k: str(v) for k, v in fields.items()},
            "recorded_at": datetime.now(UTC).isoformat(timespec="seconds"),
        }
        rows.append(row)

        self.raw_dir.mkdir(parents=True, exist_ok=True)
        tmp = self.metadata_path.with_name(f".metadata.{uuid.uuid4().hex}.part")
        try:
            with tmp.open("w", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=METADATA_COLUMNS, extrasaction="ignore")
                writer.writeheader()
                writer.writerows(rows)
            os.replace(tmp, self.metadata_path)
        finally:
            tmp.unlink(missing_ok=True)
