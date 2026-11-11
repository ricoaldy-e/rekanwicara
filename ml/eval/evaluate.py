"""SPEC §11 metrics: per LOSO fold (before and after tuning), pooled, and on all data with the final
thresholds; block G retries, wrongly rejected clips, latency.

Usage (from the repo root, with the server venv; run ml/eval/tune_thresholds.py first):
    server\\.venv\\Scripts\\python ml/eval/evaluate.py

Saves tables to data/processed/eval_results.md; prints no clip details.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "server"))

from app.content.loader import load_content  # noqa: E402
from app.core.cli import run_cli  # noqa: E402
from app.core.thresholds import load_thresholds  # noqa: E402
from app.dataset import evaluation as ev  # noqa: E402


def pct(agree: int, n: int) -> str:
    return "0/0" if n == 0 else f"{agree}/{n} = {agree / n:.0%}"


def kappa(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.2f}"


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--data-dir", type=Path, default=REPO / "data")
    args = ap.parse_args()

    tuning_path = args.data_dir / "processed" / "a6_tuning.json"
    if not tuning_path.is_file():
        print("Run ml/eval/tune_thresholds.py first.")
        return 1
    tuning = json.loads(tuning_path.read_text(encoding="utf-8"))
    current = load_thresholds()
    baseline = ev.with_params(current, tuning["baseline"])  # the values before A6
    clips = ev.load_clips(args.data_dir, load_content())

    lines = ["## LOSO: setel di 2 orang, uji di orang ke-3", ""]
    lines += ["| uji | metrik | sebelum A6 | sesudah A6 | kappa sesudah |", "|---|---|---|---|---|"]
    totals = {m: [0, 0, 0, 0] for m in ev.METRICS}  # before agree, before n, after agree, after n
    loso_after: dict[str, list[ev.Sample]] = {m: [] for m in ev.METRICS}
    for fold in tuning["folds"]:
        test = [c for c in clips if c.speaker == fold["test_speaker"]]
        anchors = ev.anchors_from([c for c in clips if c.speaker != fold["test_speaker"]], current)
        tuned = ev.with_params(current, fold["params"])
        for m in ev.METRICS:
            before = ev.score(ev.samples(test, baseline, anchors, m))
            after_samples = ev.samples(test, tuned, anchors, m)
            after = ev.score(after_samples)
            loso_after[m] += after_samples
            totals[m] = [
                totals[m][0] + before.agree, totals[m][1] + before.n,
                totals[m][2] + after.agree, totals[m][3] + after.n,
            ]  # fmt: skip
            lines.append(
                f"| {fold['test_speaker']} | {ev.METRIC_NAMES[m]} "
                f"| {before.text()} | {after.text()} "
                f"| {kappa(after.kappa)} |"
            )

    lines += ["", "## Ringkasan LOSO (setiap klip diuji tepat sekali) dan target SPEC §11", ""]
    lines += [
        "| metrik | sebelum A6 | sesudah A6 | kappa | target | tercapai |",
        "|---|---|---|---|---|---|",
    ]
    for m in ev.METRICS:
        bA, bN, aA, aN = totals[m]
        k = ev.score(loso_after[m]).kappa
        ok = aN > 0 and aA / aN >= ev.TARGETS[m]
        lines.append(
            f"| {ev.METRIC_NAMES[m]} | {pct(bA, bN)} | {pct(aA, aN)} | {kappa(k)} "
            f"| ≥ {ev.TARGETS[m]:.0%} | {'ya' if ok else 'belum'} |"
        )

    final_anchors = {k: tuple(v) for k, v in tuning["final_anchors"].items()}
    final = ev.evaluate(clips, current, final_anchors)
    lines += [
        "",
        "## Ambang final pada ketiga orang (dalam sampel: lebih optimis daripada LOSO)",
        "",
    ]
    lines += ["| metrik | hasil | kappa |", "|---|---|---|"]
    lines += [f"| {ev.METRIC_NAMES[m]} | {s.text()} | {kappa(s.kappa)} |" for m, s in final.items()]

    lines += ["", "## Confusion (LOSO sesudah A6)", ""]
    for m, yes, no in (
        ("closure", "rapat", "tidak rapat"),
        ("voicing", "sesuai target", "tidak sesuai"),
    ):
        s = ev.score(loso_after[m])
        lines += [
            f"**{ev.METRIC_NAMES[m]}**", "",
            f"| manusia \\ mesin | {yes} | {no} |", "|---|---|---|",
            f"| {yes} | {s.tp} | {s.fn} |", f"| {no} | {s.fp} | {s.tn} |", "",
        ]  # fmt: skip

    k1 = ev.k1_checks(clips)
    lat = ev.latency(clips)
    lines += ["## Kualitas rekaman (K1) dan waktu", ""]
    face, noise, good = k1["bad_face_retry"], k1["bad_noise_retry"], k1["good_rejected"]
    lines += [
        f"- Klip wajah keluar bingkai (`bad_face`) diminta ulang: {pct(*face)} (target: semua)",
        f"- Klip bising (`bad_noise`) diminta ulang: {pct(*noise)} "
        "(SPEC: retry, atau tetap dinilai bila suara jelas)",
        f"- Klip layak (kualitas baik menurut kedua penilai) yang salah ditolak: {pct(*good)} "
        "(target < 10%)",
        f"- Waktu proses server per klip (n = {lat['n']}): p50 {lat['p50']:.0f} ms, "
        f"p90 {lat['p90']:.0f} ms (target p90 ≤ 5 s)",
    ]

    def yes(flag: bool) -> str:
        return "ya" if flag else "tidak"

    lines += ["", "## Ketidakcocokan (LOSO sesudah A6)", ""]
    for m in ev.METRICS:
        wrong = [s for s in loso_after[m] if s.truth != s.machine]
        lines.append(f"**{ev.METRIC_NAMES[m]}** ({len(wrong)})")
        lines += [
            f"- {s.clip_id}: manusia {yes(s.truth)}, mesin {yes(s.machine)} ({s.detail})"
            for s in wrong
        ] or ["- (tidak ada)"]
        lines.append("")

    text = "\n".join(lines)
    out = args.data_dir / "processed" / "eval_results.md"
    out.write_text(text, encoding="utf-8")
    print("Evaluation report saved locally.")
    return 0


if __name__ == "__main__":
    run_cli(main)
