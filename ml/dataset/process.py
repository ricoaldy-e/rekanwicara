"""Process every recorded clip with the server pipeline and write the automatic labels (A4).

Usage (from the repo root, with the server venv):
    server\\.venv\\Scripts\\python ml/dataset/process.py [--force] [--only P1] [--data-dir data]

Writes data/processed/{clip_id}.json + .npz, data/processed/_failures.json and
data/labels/auto_labels.csv. Clips already processed with the current thresholds are skipped;
--force redoes them. Exit code 1 if any clip failed.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "server"))

from app.content.loader import load_content  # noqa: E402
from app.core.thresholds import load_thresholds  # noqa: E402
from app.dataset.labels import clip_path, read_metadata, write_auto_labels  # noqa: E402
from app.dataset.process import is_processed, process_clip, thresholds_sha  # noqa: E402

MODEL = REPO / "server" / "models" / "face_landmarker.task"


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--data-dir", type=Path, default=REPO / "data")
    ap.add_argument("--force", action="store_true", help="process clips again even when up to date")
    ap.add_argument("--only", help="speaker id (P1, P2 or P3) to process")
    args = ap.parse_args()

    raw, processed = args.data_dir / "raw", args.data_dir / "processed"
    metadata = [r for r in read_metadata(raw) if not args.only or r["speaker_id"] == args.only]
    if not metadata:
        print("No clips found in", raw / "metadata.csv")
        return 1
    if not MODEL.is_file():
        print(
            "face_landmarker.task is missing: run python scripts/download_models.py (from server/)"
        )
        return 1

    content, thresholds, sha = load_content(), load_thresholds(), thresholds_sha()
    failed: list[dict[str, str]] = []
    done = skipped = 0
    start = time.perf_counter()
    for number, row in enumerate(metadata, start=1):
        cid = row["clip_id"]
        if not args.force and is_processed(processed, cid, sha):
            skipped += 1
            continue
        try:
            summary = process_clip(clip_path(raw, row), row, content, thresholds, MODEL, processed)
            done += 1
            flags = summary["quality_flags"] or ""
            print(f"[{number}/{len(metadata)}] {cid}: {summary['status']} {flags}")
        except Exception as exc:  # noqa: BLE001 (report and go on: one bad clip must not stop the batch)
            failed.append({"clip_id": cid, "error": f"{type(exc).__name__}: {exc}"[:200]})
            print(f"[{number}/{len(metadata)}] {cid}: FAILED {failed[-1]['error']}")

    processed.mkdir(parents=True, exist_ok=True)
    (processed / "_failures.json").write_text(json.dumps(failed, indent=2), encoding="utf-8")
    rows = write_auto_labels(
        raw, {i.item_id: i for i in content.items}, args.data_dir / "labels" / "auto_labels.csv"
    )
    seconds = time.perf_counter() - start
    print(f"\nprocessed {done}, skipped {skipped}, failed {len(failed)} in {seconds:.0f} s")
    print(f"auto labels: {rows} rows -> {args.data_dir / 'labels' / 'auto_labels.csv'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
