"""Processes recorded dataset clips with the SAME pipeline as /v1/analyze (SPEC §4, A4).

One clip -> ``data/processed/{clip_id}.json`` (quality flags, per-unit scores, timings) and
``.npz`` (the lip and voice series). Keeping the series lets phase A6 re-score the whole dataset
with new thresholds without running MediaPipe again. Clips are scored WITHOUT calibration (the
§6.3 defaults), like a first-time user.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict
from pathlib import Path

import numpy as np

from app.content.loader import Content
from app.core.thresholds import THRESHOLDS_PATH, Thresholds
from app.pipeline import calibration as calib
from app.pipeline.features import ClipFeatures, extract_clip_features
from app.pipeline.hints import pick_hint, retry_hint
from app.pipeline.rules import score_item, score_of, worst
from app.pipeline.segment import speech_region


def thresholds_sha() -> str:
    """Short hash of thresholds.yaml: a processed clip is stale once the thresholds change."""
    return hashlib.sha256(THRESHOLDS_PATH.read_bytes()).hexdigest()[:12]


def _paths(out_dir: Path, clip_id: str) -> tuple[Path, Path]:
    return out_dir / f"{clip_id}.json", out_dir / f"{clip_id}.npz"


def is_processed(out_dir: Path, clip_id: str, sha: str | None = None) -> bool:
    """True when both outputs exist and were made with the current thresholds."""
    json_path, npz_path = _paths(out_dir, clip_id)
    if not (json_path.is_file() and npz_path.is_file()):
        return False
    try:
        return json.loads(json_path.read_text(encoding="utf-8")).get("thresholds_sha") == (
            sha or thresholds_sha()
        )
    except (OSError, json.JSONDecodeError):
        return False


def _summary(
    row: dict[str, str], feats: ClipFeatures, content: Content, t: Thresholds, sha: str
) -> dict[str, object]:
    item = content.items_by_id[row["item_id"]]
    a, f = feats.audio, feats.face
    region = speech_region(feats, t.segment, t.audio.time_step_s * 1000)
    flags = list(feats.quality_flags)
    summary: dict[str, object] = {
        "clip_id": row["clip_id"],
        "speaker_id": row["speaker_id"],
        "item_id": row["item_id"],
        "intended_error": row["intended_error"],
        "condition": row["condition"],
        "thresholds_sha": sha,
        "quality_flags": flags,
        "av_offset_ms": feats.av_offset_ms,
        "audio": {
            "peak_db": a.peak_db,
            "noise_floor_db": a.noise_floor_db,
            "noise_floor_uncertain": a.noise_floor_uncertain,
            "speech_ms": a.speech_ms,
        },
        "face": {"face_frame_ratio": f.face_frame_ratio, "face_width_ratio": f.face_width_ratio},
        "speech_region_ms": None if region is None else list(region),
        "timings_ms": asdict(feats.timings),
    }
    hint = retry_hint(flags)
    if hint is not None or region is None:
        summary.update(
            status="retry", hint_id=hint or "retry_short", overall=None, score=None, units=None
        )
        return summary

    anchors = calib.anchors(None, t)
    result = score_item(item.item_id, item.units, feats.lips, feats.voice, region, anchors, t)
    summary.update(
        status="ok",
        hint_id=pick_hint(result.units),
        overall=worst(result.statuses),
        score=score_of(result.statuses),
        units=[asdict(u) for u in result.units],
    )
    return summary


def _series(feats: ClipFeatures) -> dict[str, np.ndarray]:
    lips, voice = feats.lips, feats.voice
    return {
        "lip_t_ms": lips.t_ms,
        "lip_jaw_open": lips.jaw_open,
        "lip_gap_ratio": lips.lip_gap_ratio,
        "lip_width_ratio": lips.lip_width_ratio,
        "lip_rounding": lips.rounding,
        "lip_closed": lips.closed,
        "voice_t_ms": voice.t_ms,
        "voice_intensity_db": voice.intensity_db,
        "voice_f0_hz": voice.f0_hz,
        "voice_voiced": voice.voiced,
        "voice_f1_hz": voice.f1_hz,
        "voice_f2_hz": voice.f2_hz,
    }


def _write_atomic(path: Path, write) -> None:  # type: ignore[no-untyped-def]
    tmp = path.with_name(f".{path.name}.part")
    try:
        write(tmp)
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def process_clip(
    video: Path,
    row: dict[str, str],
    content: Content,
    t: Thresholds,
    model_path: Path,
    out_dir: Path,
) -> dict[str, object]:
    """Extracts, scores and writes one clip. Pipeline errors propagate; the caller reports them."""
    sha = thresholds_sha()
    with video.open("rb") as fh:
        feats = extract_clip_features(fh, t, model_path)
    summary = _summary(row, feats, content, t, sha)

    out_dir.mkdir(parents=True, exist_ok=True)
    json_path, npz_path = _paths(out_dir, row["clip_id"])
    # npz first: a reader that sees the json can rely on the series being there.
    _write_atomic(npz_path, lambda p: _savez(p, _series(feats)))
    _write_atomic(
        json_path, lambda p: p.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    )
    return summary


def _savez(path: Path, arrays: dict[str, np.ndarray]) -> None:
    with path.open("wb") as fh:
        np.savez_compressed(fh, **arrays)
