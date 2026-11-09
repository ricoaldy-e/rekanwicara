import json
import shutil
from pathlib import Path

import pytest

from app.content.loader import (
    CONTENT_DIR,
    REQUIRED_HINT_IDS,
    ContentError,
    load_content,
    unit_phones,
)


@pytest.fixture
def content_copy(tmp_path: Path) -> Path:
    target = tmp_path / "content"
    target.mkdir()
    for name in ("items.json", "hints.json"):
        shutil.copy(CONTENT_DIR / name, target / name)
    return target


def _edit_items(content_dir: Path, mutate) -> None:
    path = content_dir / "items.json"
    items = json.loads(path.read_text(encoding="utf-8"))
    mutate(items)
    path.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")


def test_real_content_loads() -> None:
    content = load_content()
    assert len(content.items) == 29
    assert set(content.hints) == REQUIRED_HINT_IDS


def test_bonus_items_are_inactive() -> None:
    content = load_content()
    bonus = {i.item_id for i in content.items if i.priority == "bonus"}
    assert bonus == {"l1_e", "l1_o", "l3_mau", "l3_bau", "l3_boba"}
    assert not any(content.items_by_id[i].active for i in bonus)


@pytest.mark.parametrize(
    ("unit", "phones"),
    [
        ("a", ["V:a"]),
        ("o", ["V:o"]),
        ("m_hum", ["C:m"]),
        ("ma", ["C:m", "V:a"]),
        ("pi", ["C:p", "V:i"]),
        ("bu", ["C:b", "V:u"]),
    ],
)
def test_unit_phones_accepts_stage_a(unit: str, phones: list[str]) -> None:
    assert unit_phones(unit) == phones


@pytest.mark.parametrize("unit", ["na", "ta", "ka", "s", "mam", "am", "", "M", "p"])
def test_unit_phones_rejects_non_stage_a(unit: str) -> None:
    with pytest.raises(ContentError, match="Stage A"):
        unit_phones(unit)


def test_item_with_non_stage_a_unit_is_rejected(content_copy: Path) -> None:
    _edit_items(
        content_copy,
        lambda items: items.append(
            {"item_id": "l3_nana", "level": 3, "text": "nana", "units": ["na", "na"],
             "priority": "bonus", "emoji": None, "active": True}
        ),
    )  # fmt: skip
    with pytest.raises(ContentError, match=r"items\.json: item 'l3_nana': unit 'na'"):
        load_content(content_copy)


def test_duplicate_item_id_is_rejected(content_copy: Path) -> None:
    _edit_items(content_copy, lambda items: items.append(dict(items[0])))
    with pytest.raises(ContentError, match="duplicate item_id 'l0_hold_a'"):
        load_content(content_copy)


def test_level_must_match_item_id_prefix(content_copy: Path) -> None:
    def mutate(items: list[dict]) -> None:
        items[2]["level"] = 2  # l1_a

    _edit_items(content_copy, mutate)
    with pytest.raises(ContentError, match="'l1_a' has level 2"):
        load_content(content_copy)


def test_forbidden_word_in_hint_is_rejected(content_copy: Path) -> None:
    path = content_copy / "hints.json"
    hints = json.loads(path.read_text(encoding="utf-8"))
    hints["ok_good"] = "Suaramu sudah normal."
    path.write_text(json.dumps(hints), encoding="utf-8")
    with pytest.raises(ContentError, match="forbidden word 'normal'"):
        load_content(content_copy)


def test_missing_hint_is_rejected(content_copy: Path) -> None:
    path = content_copy / "hints.json"
    hints = json.loads(path.read_text(encoding="utf-8"))
    del hints["p_silent"]
    path.write_text(json.dumps(hints), encoding="utf-8")
    with pytest.raises(ContentError, match="missing hint ids \\['p_silent'\\]"):
        load_content(content_copy)
