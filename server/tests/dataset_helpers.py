"""A small fake data/ directory (metadata + clip files) for the dataset tests."""

import csv
from pathlib import Path

from app.core.storage import METADATA_COLUMNS

# (speaker, item, rep, intended_error, condition)
ROWS = [
    ("P1", "l1_a", 1, "none", "quiet"),
    ("P1", "l3_mama", 1, "mama_as_papa", "quiet"),
    ("P2", "l1_a", 1, "none", "quiet"),
    ("P2", "l3_mama", 1, "none", "quiet"),
    ("P3", "l1_u", 1, "u_flat_lips", "quiet"),
    ("P3", "l1_a", 1, "bad_noise", "noisy"),
]


def clip_id(row: tuple[str, str, int, str, str]) -> str:
    s, item, rep, err, cond = row
    return f"{s}__{item}__r{rep}__{err}__{cond}"


def make_dataset(data_dir: Path, video: bytes, rows=ROWS) -> list[dict[str, str]]:
    raw = data_dir / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    meta = []
    for row in rows:
        s, item, rep, err, cond = row
        (raw / s).mkdir(exist_ok=True)
        (raw / s / f"{item}__r{rep}__{err}__{cond}.mp4").write_bytes(video)
        meta.append(
            dict(
                zip(
                    METADATA_COLUMNS,
                    [
                        clip_id(row),
                        s,
                        item,
                        str(rep),
                        err,
                        cond,
                        "sess",
                        "2026-11-11T00:00:00+00:00",
                        "test",
                    ],
                    strict=True,
                )
            )
        )
    with (raw / "metadata.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=METADATA_COLUMNS)
        writer.writeheader()
        writer.writerows(meta)
    return meta
