"""Dataset report (A4): what was recorded, processed and checked, and how well the annotators agree.

Machine results are not part of this report (that is the evaluation of phase A6). Label agreement is
between the human annotators only.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from app.dataset.labels import (
    ANNOTATORS,
    all_labels,
    cohens_kappa,
    percent_agreement,
    read_metadata,
)
from app.dataset.process import is_processed, thresholds_sha

AGREEMENT_FIELDS = (
    ("matches_request", "sesuai materi"),
    ("lips_wrong", "bibir salah"),
    ("quality_ok", "kualitas baik"),
)
ERROR_CLIPS = (
    "mama_as_papa",
    "u_flat_lips",
    "a_narrow",
    "mama_no_closure",
)  # errors a person can see


def counts(metadata: list[dict[str, str]]) -> tuple[Counter[str], dict[str, Counter[str]]]:
    """Clips per speaker, and per item with a per-speaker breakdown."""
    per_speaker = Counter(r["speaker_id"] for r in metadata)
    per_item: dict[str, Counter[str]] = {}
    for r in metadata:
        per_item.setdefault(r["item_id"], Counter())[r["speaker_id"]] += 1
    return per_speaker, per_item


def processing_status(metadata: list[dict[str, str]], processed_dir: Path) -> dict[str, list[str]]:
    sha = thresholds_sha()
    status: dict[str, list[str]] = {"done": [], "stale": [], "missing": []}
    for r in metadata:
        cid = r["clip_id"]
        if is_processed(processed_dir, cid, sha):
            status["done"].append(cid)
        elif (processed_dir / f"{cid}.json").is_file():
            status["stale"].append(cid)  # processed with other thresholds: run process.py again
        else:
            status["missing"].append(cid)
    return status


def failures(processed_dir: Path) -> list[dict[str, str]]:
    path = processed_dir / "_failures.json"
    if not path.is_file():
        return []
    try:
        return list(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError):
        return []


def checkers(row: dict[str, str]) -> tuple[str, str]:
    """The two annotators who are not the speaker of this clip (SPEC §10.5)."""
    first, second = (a for a in ANNOTATORS if a != row["speaker_id"])
    return first, second


def unchecked(
    metadata: list[dict[str, str]], labels: dict[str, dict[str, dict[str, str]]]
) -> dict[str, list[str]]:
    """annotator -> clip ids that annotator still has to check."""
    todo: dict[str, list[str]] = {a: [] for a in ANNOTATORS}
    for r in metadata:
        for a in checkers(r):
            if r["clip_id"] not in labels.get(a, {}):
                todo[a].append(r["clip_id"])
    return todo


def agreement(
    metadata: list[dict[str, str]], labels: dict[str, dict[str, dict[str, str]]]
) -> list[dict[str, object]]:
    """Per annotator pair and pooled: clips both labelled, % agreement and Cohen's kappa."""
    rows: list[dict[str, object]] = []
    groups: dict[str, list[tuple[dict[str, str], dict[str, str]]]] = {"semua": []}
    for r in metadata:
        a, b = checkers(r)
        la, lb = labels.get(a, {}).get(r["clip_id"]), labels.get(b, {}).get(r["clip_id"])
        if la is not None and lb is not None:
            groups.setdefault(f"{a}-{b}", []).append((la, lb))
            groups["semua"].append((la, lb))
    for name, pairs in groups.items():
        for field, label in AGREEMENT_FIELDS:
            xs, ys = [p[0][field] for p in pairs], [p[1][field] for p in pairs]
            rows.append(
                {
                    "pair": name,
                    "field": label,
                    "n": len(pairs),
                    "percent": percent_agreement(xs, ys),
                    "kappa": cohens_kappa(xs, ys),
                }
            )
    return rows


def review_list(
    metadata: list[dict[str, str]], labels: dict[str, dict[str, dict[str, str]]]
) -> list[tuple[str, str]]:
    """(clip_id, reason): clips whose automatic label a person doubts; decide before A6 tuning."""
    out: list[tuple[str, str]] = []
    for r in metadata:
        cid = r["clip_id"]
        given = [labels.get(a, {}).get(cid) for a in checkers(r)]
        given = [g for g in given if g is not None]
        if not given:
            continue
        error = r["intended_error"]
        if error == "none" and any(
            g["matches_request"] == "0" or g["quality_ok"] == "0" for g in given
        ):
            out.append((cid, "klip 'benar' dinilai tidak sesuai atau berkualitas buruk"))
        elif (
            error in ERROR_CLIPS
            and len(given) == 2
            and all(g["matches_request"] == "1" and g["lips_wrong"] == "0" for g in given)
        ):
            out.append((cid, "kesalahan sengaja tidak terlihat oleh kedua annotator"))
        if len(given) == 2 and given[0]["matches_request"] != given[1]["matches_request"]:
            out.append((cid, "annotator berbeda pendapat tentang kesesuaian"))
    return out


def _pct(value: object) -> str:
    return "n/a" if value is None else f"{float(value) * 100:.0f}%"  # type: ignore[arg-type]


def _kappa(value: object) -> str:
    return "n/a" if value is None else f"{float(value):.2f}"  # type: ignore[arg-type]


def render(data_dir: Path) -> str:
    raw_dir, processed_dir = data_dir / "raw", data_dir / "processed"
    metadata = read_metadata(raw_dir)
    labels = all_labels(data_dir)
    per_speaker, per_item = counts(metadata)
    status = processing_status(metadata, processed_dir)
    todo = unchecked(metadata, labels)
    lines = [
        "# Laporan dataset",
        "",
        f"Klip tercatat: **{len(metadata)}**",
        "",
        "## Klip per orang",
        "",
    ]
    lines += [f"- {s}: {per_speaker.get(s, 0)}" for s in ANNOTATORS]

    lines += [
        "",
        "## Klip per materi",
        "",
        "| materi | " + " | ".join(ANNOTATORS) + " | total |",
        "|---|---|---|---|---|",
    ]
    for item_id in sorted(per_item):
        c = per_item[item_id]
        lines.append(
            f"| {item_id} | "
            + " | ".join(str(c.get(s, 0)) for s in ANNOTATORS)
            + f" | {sum(c.values())} |"
        )

    lines += ["", "## Pemrosesan", ""]
    lines.append(f"- Selesai (ambang saat ini): {len(status['done'])}")
    lines.append(f"- Usang (diproses dengan ambang lain): {len(status['stale'])}")
    lines.append(f"- Belum diproses: {len(status['missing'])}")
    failed = failures(processed_dir)
    lines.append(f"- Gagal: {len(failed)}")
    lines += [f"  - {f.get('clip_id')}: {f.get('error')}" for f in failed]

    lines += ["", "## Cek label", ""]
    for a in ANNOTATORS:
        expected = sum(1 for r in metadata if a in checkers(r))
        lines.append(f"- {a}: sudah {expected - len(todo[a])} dari {expected}")
    waiting = sorted({cid for ids in todo.values() for cid in ids})
    lines.append(f"- Klip yang belum dicek lengkap oleh kedua annotator: {len(waiting)}")

    lines += [
        "",
        "## Kesepakatan antar-annotator",
        "",
        "| pasangan | aspek | klip | kesepakatan | kappa |",
        "|---|---|---|---|---|",
    ]
    for row in agreement(metadata, labels):
        cells = [row["pair"], row["field"], row["n"], _pct(row["percent"]), _kappa(row["kappa"])]
        lines.append("| " + " | ".join(str(c) for c in cells) + " |")
    lines.append("")
    lines.append(
        "Kappa n/a: belum ada pasangan klip, atau semua jawaban sama (kappa tidak terdefinisi)."
    )

    review = review_list(metadata, labels)
    lines += ["", "## Klip yang perlu ditinjau", ""]
    lines += [f"- {cid}: {reason}" for cid, reason in review] or ["- (belum ada)"]
    return "\n".join(lines) + "\n"
