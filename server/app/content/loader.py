"""Load and validate learning content (SPEC §3, §10.2, §13).

Validation is strict on purpose: the server refuses to start with content that breaks the rules.
"""

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import ValidationError

from app.api.schemas import Item

CONTENT_DIR = Path(__file__).resolve().parent

# Stage A phones (SPEC §3): consonants C:m, C:p, C:b; vowels V:a, V:i, V:u, V:e, V:o.
STAGE_A_CONSONANTS = frozenset({"m", "p", "b"})
STAGE_A_VOWELS = frozenset({"a", "i", "u", "e", "o"})
HUM_UNIT = "m_hum"  # sustained "mmm" (Level 1), made of C:m only

# Hint ids from SPEC §13; hints.json must define exactly these.
REQUIRED_HINT_IDS = frozenset(
    {
        "ok_good",
        "l0_duration_short",
        "l0_loudness_flat",
        "a_open",
        "i_spread",
        "u_round",
        "closure_missing",
        "m_voicing",
        "p_silent",
        "b_voicing",
        "retry_no_face",
        "retry_off_frame",
        "retry_quiet",
        "retry_noisy",
        "retry_clipping",
        "retry_short",
    }
)

# Product boundary (CLAUDE.md): these words must never reach the UI or API output.
FORBIDDEN_WORDS = ("normal", "abnormal", "gangguan", "diagnosis")

_EXTRA_ITEM_ID = re.compile(r"^other_[a-z]+$")


class ContentError(ValueError):
    """Raised when content files break the rules. The message names the file, item and reason."""


def unit_phones(unit: str) -> list[str]:
    """Split a unit into Stage A phones, e.g. ``"ma" -> ["C:m", "V:a"]``.

    Raises ContentError if the unit is not made only of Stage A phones.
    """
    if unit == HUM_UNIT:
        return ["C:m"]
    if len(unit) == 1 and unit in STAGE_A_VOWELS:
        return [f"V:{unit}"]
    if len(unit) == 2 and unit[0] in STAGE_A_CONSONANTS and unit[1] in STAGE_A_VOWELS:
        return [f"C:{unit[0]}", f"V:{unit[1]}"]
    raise ContentError(
        f"unit '{unit}' is not made of Stage A phones "
        f"(consonants {sorted(STAGE_A_CONSONANTS)}, vowels {sorted(STAGE_A_VOWELS)}, "
        f"or '{HUM_UNIT}')"
    )


def _check_forbidden_words(source: str, key: str, text: str) -> None:
    lowered = text.lower()
    for word in FORBIDDEN_WORDS:
        if word in lowered:
            raise ContentError(f"{source}: '{key}' contains forbidden word '{word}'")


def _read_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ContentError(f"{path.name}: file not found") from exc
    except json.JSONDecodeError as exc:
        raise ContentError(f"{path.name}: invalid JSON ({exc.msg} at line {exc.lineno})") from exc


def load_items(path: Path) -> list[Item]:
    raw = _read_json(path)
    if not isinstance(raw, list):
        raise ContentError(f"{path.name}: expected a JSON list of items")

    items: list[Item] = []
    seen: set[str] = set()
    for position, entry in enumerate(raw):
        label = entry.get("item_id", f"#{position}") if isinstance(entry, dict) else f"#{position}"
        try:
            item = Item.model_validate(entry)
        except ValidationError as exc:
            raise ContentError(f"{path.name}: item '{label}' is invalid: {exc}") from exc

        if item.item_id in seen:
            raise ContentError(f"{path.name}: duplicate item_id '{item.item_id}'")
        seen.add(item.item_id)

        if not item.item_id.startswith(f"l{item.level}_"):
            raise ContentError(
                f"{path.name}: item '{item.item_id}' has level {item.level}, "
                f"but its id does not start with 'l{item.level}_'"
            )

        for unit in item.units:
            try:
                unit_phones(unit)
            except ContentError as exc:
                raise ContentError(f"{path.name}: item '{item.item_id}': {exc}") from exc

        _check_forbidden_words(path.name, item.item_id, item.text)
        items.append(item)
    return items


def load_hints(path: Path) -> dict[str, str]:
    raw = _read_json(path)
    if not isinstance(raw, dict) or not all(
        isinstance(k, str) and isinstance(v, str) and v.strip() for k, v in raw.items()
    ):
        raise ContentError(f"{path.name}: expected an object of hint_id -> non-empty sentence")

    missing = REQUIRED_HINT_IDS - raw.keys()
    if missing:
        raise ContentError(f"{path.name}: missing hint ids {sorted(missing)}")
    unknown = raw.keys() - REQUIRED_HINT_IDS
    if unknown:
        raise ContentError(f"{path.name}: unknown hint ids {sorted(unknown)} (not in SPEC §13)")

    for hint_id, sentence in raw.items():
        _check_forbidden_words(path.name, hint_id, sentence)
    return dict(raw)


def load_dataset_extra_items(path: Path, item_ids: set[str]) -> list[str]:
    """Ids for dataset-only recordings of class ``other`` (SPEC §10.2 blocks D/E).

    These are deliberately NOT Stage A and never appear in GET /v1/items.
    """
    raw = _read_json(path)
    if not isinstance(raw, list):
        raise ContentError(f"{path.name}: expected a JSON list")
    ids: list[str] = []
    for position, entry in enumerate(raw):
        item_id = entry.get("item_id") if isinstance(entry, dict) else None
        if not isinstance(item_id, str) or not _EXTRA_ITEM_ID.match(item_id):
            raise ContentError(f"{path.name}: entry #{position} needs an item_id like 'other_na'")
        if item_id in item_ids or item_id in ids:
            raise ContentError(f"{path.name}: duplicate item_id '{item_id}'")
        ids.append(item_id)
    return ids


@dataclass(frozen=True)
class Content:
    items: list[Item]
    hints: dict[str, str]
    dataset_extra_item_ids: frozenset[str]
    items_by_id: dict[str, Item] = field(init=False)

    def __post_init__(self) -> None:
        object.__setattr__(self, "items_by_id", {item.item_id: item for item in self.items})

    @property
    def active_items(self) -> list[Item]:
        return [item for item in self.items if item.active]


def load_content(content_dir: Path = CONTENT_DIR) -> Content:
    items = load_items(content_dir / "items.json")
    hints = load_hints(content_dir / "hints.json")
    extra = load_dataset_extra_items(
        content_dir / "dataset_extra_items.json", {item.item_id for item in items}
    )
    return Content(items=items, hints=hints, dataset_extra_item_ids=frozenset(extra))
