"""Tune the main thresholds with leave-one-speaker-out (SPEC §10.6), then on all three speakers.

Usage (from the repo root, with the server venv; run ml/dataset/process.py first):
    server\\.venv\\Scripts\\python ml/eval/tune_thresholds.py [--write]

Saves data/processed/a6_tuning.json (baseline, per-fold and final values, used by evaluate.py).
--write puts the final values into server/app/config/thresholds.yaml, keeping the old value in the
line's comment.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "server"))

from app.content.loader import load_content  # noqa: E402
from app.core.thresholds import THRESHOLDS_PATH, load_thresholds  # noqa: E402
from app.dataset import evaluation as ev  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--data-dir", type=Path, default=REPO / "data")
    ap.add_argument(
        "--write", action="store_true", help="write the final values to thresholds.yaml"
    )
    args = ap.parse_args()

    base = load_thresholds()
    clips = ev.load_clips(args.data_dir, load_content())
    if not clips:
        print("No processed clips: run ml/dataset/process.py first.")
        return 1

    folds = ev.run_loso(clips, base)
    anchors = ev.anchors_from(clips, base)
    final = ev.tune(clips, base, anchors)
    baseline = {path: ev.get_param(base, path) for _, path, _ in ev.GRID}
    result = {
        "baseline": baseline,
        "folds": [{"test_speaker": f.test_speaker, "params": f.params} for f in folds],
        "final": final,
        "final_anchors": anchors,
    }
    out = args.data_dir / "processed" / "a6_tuning.json"
    out.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(
        f"{'parameter':42s} {'before':>7s} "
        + " ".join(f"{f.test_speaker:>6s}" for f in folds)
        + "   final"
    )
    for _, path, _ in ev.GRID:
        cells = " ".join(f"{f.params[path]:6g}" for f in folds)
        print(f"{path:42s} {baseline[path]:7g} {cells}   {final[path]:g}")
    print("saved:", out)

    if args.write:
        text = THRESHOLDS_PATH.read_text(encoding="utf-8")
        new = ev.update_yaml(text, ev.expand(final), "disetel A6 (LOSO, 3 penutur)")
        THRESHOLDS_PATH.write_text(new, encoding="utf-8")
        try:
            written = load_thresholds()  # the server would refuse to start with a broken file
        except Exception:
            THRESHOLDS_PATH.write_text(text, encoding="utf-8")  # put the old file back
            raise
        assert all(ev.get_param(written, p) == v for p, v in final.items()), "value not written"
        print("written:", THRESHOLDS_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())
