"""Generic text comparison; no error dictionaries, regex variants, or pronunciation claims."""

import unicodedata

from app.api.schemas import SpeechOutcome
from app.core.thresholds import ExperimentsConfig


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text).casefold()
    return " ".join(
        "".join(
            " " if unicodedata.category(char).startswith("P") else char for char in text
        ).split()
    )


def edit_distance(reference: str, prediction: str) -> int:
    previous = list(range(len(prediction) + 1))
    for row, expected in enumerate(reference, start=1):
        current = [row]
        for column, actual in enumerate(prediction, start=1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[column] + 1,
                    previous[column - 1] + (expected != actual),
                )
            )
        previous = current
    return previous[-1]


def text_outcome(target: str, prediction: str, cfg: ExperimentsConfig) -> SpeechOutcome:
    expected, actual = normalize_text(target), normalize_text(prediction)
    if not actual:
        return "coba_lagi"
    if actual == expected:
        return "berhasil"
    distance = edit_distance(expected, actual)
    if len(expected) <= cfg.short_target_max_chars:
        near = distance <= cfg.short_near_max_edits
    else:
        near = 1 - distance / max(len(expected), len(actual)) >= cfg.near_similarity_min
    return "mendekati" if near else "coba_lagi"
