"""Plot the A2 lip and voice series of recordings against time, to check and tune thresholds.

Usage (from the repo root, with the server venv):
    server\\.venv\\Scripts\\python ml/tools/plot_features.py <video.mp4> [more.mp4 ...]

Panels: jaw_open, lip_gap_ratio (with the `closed` threshold), rounding, intensity, voiced (0/1),
F1, F2. Shaded spans = lip closures (closed for >= closure_min_frames frames, §6.6.2) followed by
an opening, so the closed lips at rest after the word are not counted. The title lists each
closure with the share of voiced audio frames in its last HOLD_MS before the lips open (a
word-initial closure starts at rest, so its whole span would dilute the voicing).
Uncalibrated (fallback normalisation). Writes data/processed/plots/<speaker>__<clip>__features.png
(not committed).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "server"))

import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from app.core.thresholds import load_thresholds  # noqa: E402
from app.pipeline.features import ClipFeatures, extract_clip_features  # noqa: E402

MODEL = REPO / "server" / "models" / "face_landmarker.task"
OUT_DIR = REPO / "data" / "processed" / "plots"
# shortcut: fixed consonant-hold window for this visual summary only; A3 segmentation (§6.6)
# replaces it.
HOLD_MS = 200


def closures(
    feats: ClipFeatures, min_frames: int, frame_ms: float
) -> list[tuple[float, float, float]]:
    """(start_ms, end_ms, voiced_ratio) per closed run >= min_frames followed by an opening."""
    closed, t = feats.lips.closed, feats.lips.t_ms
    out: list[tuple[float, float, float]] = []
    i = 0
    while i < closed.size:
        if not closed[i]:
            i += 1
            continue
        j = i
        while j < closed.size and closed[j]:
            j += 1
        if (
            j - i >= min_frames and j < closed.size
        ):  # j == size: lips stay closed (rest), no release
            start, end = float(t[i]), float(t[j - 1]) + frame_ms
            v = feats.voice
            hold = (v.t_ms >= max(start, end - HOLD_MS)) & (v.t_ms < end)
            out.append((start, end, float(v.voiced[hold].mean()) if hold.any() else float("nan")))
        i = j
    return out


def plot(video: Path) -> Path:
    t = load_thresholds()
    with video.open("rb") as fh:
        feats = extract_clip_features(fh, t, MODEL)
    frame_ms = 1000 / t.media.fps
    runs = closures(feats, t.segment.closure_min_frames, frame_ms)

    lips, voice = feats.lips, feats.voice
    panels = [
        ("jaw_open", lips.t_ms, lips.jaw_open, None),
        ("lip_gap_ratio", lips.t_ms, lips.lip_gap_ratio, t.lips.closed_gap_ratio),
        ("rounding", lips.t_ms, lips.rounding, None),
        ("intensity (dB)", voice.t_ms, voice.intensity_db, None),
        ("voiced", voice.t_ms, voice.voiced.astype(float), None),
        ("F1 (Hz)", voice.t_ms, voice.f1_hz, None),
        ("F2 (Hz)", voice.t_ms, voice.f2_hz, None),
    ]
    fig, axes = plt.subplots(len(panels), 1, figsize=(10, 12), sharex=True)
    for ax, (name, x, y, hline) in zip(axes, panels, strict=True):
        style = "o-" if x is lips.t_ms else "-"
        ax.plot(x, y, style, ms=3, lw=1)
        if hline is not None:
            ax.axhline(hline, color="red", ls="--", lw=1)
        for start, end, _ in runs:
            ax.axvspan(start, end, color="tab:orange", alpha=0.25)
        ax.set_ylabel(name, fontsize=9)
        ax.grid(alpha=0.3)
    axes[-1].set_xlabel("ms since audio start")

    summary = "; ".join(
        f"{s:.0f}-{e:.0f} ms ({e - s:.0f} ms, voiced {vr:.0%})" for s, e, vr in runs
    )
    fig.suptitle(
        f"{video.parent.name}/{video.stem}  |  av_offset {feats.av_offset_ms} ms  |  flags: "
        f"{', '.join(feats.quality_flags) or '-'}\nclosures: {len(runs)}  {summary}",
        fontsize=9,
    )
    fig.tight_layout()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{video.parent.name}__{video.stem}__features.png"
    fig.savefig(out, dpi=90)
    plt.close(fig)
    print(f"{out}\n  closures={len(runs)}  {summary or '-'}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("videos", type=Path, nargs="+")
    for video in ap.parse_args().videos:
        plot(video)


if __name__ == "__main__":
    main()
