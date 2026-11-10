"""Leave-one-speaker-out folds (SPEC §10.6).

Usage (from the repo root, with the server venv):
    server\\.venv\\Scripts\\python ml/dataset/folds.py [--data-dir data]

Writes data/splits/fold_{1,2,3}.json: tune on two speakers, test on the third.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "server"))

from app.dataset.folds import loso_folds, write_folds  # noqa: E402
from app.dataset.labels import read_metadata  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--data-dir", type=Path, default=REPO / "data")
    args = ap.parse_args()

    metadata = read_metadata(args.data_dir / "raw")
    if not metadata:
        print("No clips found in", args.data_dir / "raw" / "metadata.csv")
        return 1
    write_folds(metadata, args.data_dir / "splits")
    for fold in loso_folds(metadata):
        print(
            f"fold {fold['fold']}: test {fold['test_speaker']} ({len(fold['test_clips'])} clips), "  # type: ignore[arg-type]
            f"tune {'+'.join(fold['tune_speakers'])} ({len(fold['tune_clips'])} clips)"  # type: ignore[arg-type]
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
