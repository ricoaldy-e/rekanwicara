"""Draw the SPEC §6.4 landmark indices on one frame of a recording, to verify them by eye.

Usage (from the repo root, with the server venv):
    server\\.venv\\Scripts\\python ml/tools/draw_landmarks.py <video.mp4> [--ms 1200]

Marks 13/14 (inner lips, green), 61/291 (mouth corners, red), 33/263 (outer eye corners, blue)
and the outer lip ring (yellow). Writes a PNG to data/processed/plots/ (not committed: it shows
a face).
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "server"))

import cv2  # noqa: E402  (bundled with mediapipe)

from app.core.cli import run_cli  # noqa: E402
from app.core.thresholds import load_thresholds  # noqa: E402
from app.pipeline.face import track_faces  # noqa: E402
from app.pipeline.media import prepared_media  # noqa: E402

MODEL = REPO / "server" / "models" / "face_landmarker.task"
OUT_DIR = REPO / "data" / "processed" / "plots"

GREEN, RED, BLUE, YELLOW = (0, 200, 0), (0, 0, 230), (230, 80, 0), (0, 220, 255)  # BGR


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("video", type=Path)
    ap.add_argument("--ms", type=int, default=None, help="frame time in ms (default: middle frame)")
    ap.add_argument("--scale", type=int, default=2, help="upscale factor for readability")
    args = ap.parse_args()

    t = load_thresholds()
    lm_idx = t.lips.landmarks
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{args.video.parent.name}__{args.video.stem}__landmarks.png"

    with args.video.open("rb") as fh, prepared_media(fh, t.media) as media:
        track = track_faces(media.frame_paths, media.frame_timestamps_ms, MODEL)
        ts = media.frame_timestamps_ms
        i = (
            len(ts) // 2
            if args.ms is None
            else min(range(len(ts)), key=lambda k: abs(ts[k] - args.ms))
        )
        frame = track.frames[i]
        img = cv2.imread(str(media.frame_paths[i]))

    if frame.landmarks is None:
        sys.exit(f"no face in the frame at {ts[i]} ms; try another --ms")

    s = args.scale
    img = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
    h, w = img.shape[:2]

    def px(k: int) -> tuple[int, int]:
        x, y = frame.landmarks[k, :2]
        return round(float(x) * w), round(float(y) * h)

    ring = [px(k) for k in t.lips.outer_lip]
    for a, b in zip(ring, ring[1:] + ring[:1], strict=True):
        cv2.line(img, a, b, YELLOW, 1, cv2.LINE_AA)
    for k, color in (
        (lm_idx.upper_inner, GREEN), (lm_idx.lower_inner, GREEN),
        (lm_idx.corner_left, RED), (lm_idx.corner_right, RED),
        (lm_idx.eye_outer_left, BLUE), (lm_idx.eye_outer_right, BLUE),
    ):  # fmt: skip
        p = px(k)
        cv2.circle(img, p, 3, color, -1, cv2.LINE_AA)
        cv2.putText(
            img, str(k), (p[0] + 5, p[1] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA
        )
    cv2.putText(
        img, f"{ts[i]} ms", (8, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA
    )

    cv2.imwrite(str(out), img)
    print("Landmark preview saved locally.")


if __name__ == "__main__":
    if shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg not found on PATH")
    run_cli(main)
