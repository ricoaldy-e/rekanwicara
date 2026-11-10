"""Leave-one-speaker-out folds (SPEC §10.6): tune on two speakers, test on the third (3 rounds)."""

from __future__ import annotations

import json
from pathlib import Path

from app.dataset.labels import ANNOTATORS


def loso_folds(metadata: list[dict[str, str]]) -> list[dict[str, object]]:
    """Fold k tests on speaker Pk and tunes on the other two. Clip ids keep metadata order."""
    folds = []
    for k, test_speaker in enumerate(ANNOTATORS, start=1):
        tune_speakers = [s for s in ANNOTATORS if s != test_speaker]
        folds.append(
            {
                "fold": k,
                "test_speaker": test_speaker,
                "tune_speakers": tune_speakers,
                "test_clips": [r["clip_id"] for r in metadata if r["speaker_id"] == test_speaker],
                "tune_clips": [r["clip_id"] for r in metadata if r["speaker_id"] in tune_speakers],
            }
        )
    return folds


def write_folds(metadata: list[dict[str, str]], splits_dir: Path) -> list[Path]:
    """data/splits/fold_{1,2,3}.json. Returns the written paths."""
    splits_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for fold in loso_folds(metadata):
        path = splits_dir / f"fold_{fold['fold']}.json"
        path.write_text(json.dumps(fold, indent=2), encoding="utf-8")
        paths.append(path)
    return paths
