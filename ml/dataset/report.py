"""Dataset report: clips per speaker and item, processing, label checks and annotator agreement.

Usage (from the repo root, with the server venv):
    server\\.venv\\Scripts\\python ml/dataset/report.py [--data-dir data]

Prints the report and saves it to data/processed/dataset_report.md (counts only, no media).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "server"))

from app.dataset.report import render  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--data-dir", type=Path, default=REPO / "data")
    args = ap.parse_args()

    text = render(args.data_dir)
    out = args.data_dir / "processed" / "dataset_report.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    print(text)
    print("saved:", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
