"""Default pronunciation guides plus owner-scoped custom words; AI targets stay separate."""

import json
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter

from app.api.deps import ContentDep
from app.api.errors import ApiError
from app.api.schemas import (
    V2Catalog,
    V2ItemDetail,
    V2Material,
    V2Syllable,
    V2WordDetail,
    V2WordStage,
    V2WordSummary,
    VideoReference,
)
from app.api.v1.tutorials import catalogue as tutorial_catalogue
from app.api.v2.store import AccountDep, AccountStore, custom_uuid
from app.content.loader import FORBIDDEN_WORDS, Content

router = APIRouter(prefix="/v2", tags=["catalog-v2"])
CUSTOM_BUCKET = "rekan-wicara-tutorials"
DEFAULT_VIDEOS = {
    item_id: VideoReference.model_validate(binding)
    for item_id, binding in json.loads(
        (Path(__file__).resolve().parents[2] / "content/default_videos.json").read_text("utf-8")
    ).items()
}
GUIDE_ITEMS = {item.item_id: item for item in tutorial_catalogue()}
GUIDE_WORDS = [item for item in GUIDE_ITEMS.values() if item.kind == "word"]
OFFLINE_IDS = frozenset(GUIDE_ITEMS)
OFFLINE_WORDS = frozenset(item.target.casefold() for item in GUIDE_WORDS)


def text(value: object) -> str:
    if (
        not isinstance(value, str)
        or not value.strip()
        or any(word in value.lower() for word in FORBIDDEN_WORDS)
    ):
        raise ApiError(422, "INVALID_MATERIAL", "Materi belum lengkap atau teks belum sesuai.")
    return value.strip()


def missing_video() -> ApiError:
    return ApiError(404, "VIDEO_NOT_FOUND", "Video tutorial materi ini belum tersedia.")


def default_instruction(item_id: str, label: str) -> str:
    return {
        "l0_hold_a": "Ucapkan A dan tahan selama rekaman.",
        "l0_soft_loud": "Ucapkan A pelan, lalu lebih kuat.",
    }.get(item_id, f"Ucapkan {label} sesuai contoh.")


@dataclass
class Catalogue:
    account: AccountStore
    content: Content

    def guide_material(self, item_id: str) -> V2Material:
        asset = GUIDE_ITEMS[item_id]
        return V2Material(
            id=asset.item_id,
            text=asset.target,
            instruction="\n".join(asset.steps),
            videos=[
                VideoReference(
                    bucket=asset.bucket,
                    path=asset.storage_path,
                    position=1,
                    available=self.account.has_video(asset.bucket, asset.storage_path),
                )
            ],
        )

    def guide_word(self, word_id: str) -> V2WordDetail:
        asset = GUIDE_ITEMS[word_id]
        if asset.kind != "word":
            raise ApiError(404, "ITEM_NOT_FOUND", "Materi tidak ditemukan.")
        parts = sorted(
            (
                item
                for item in GUIDE_ITEMS.values()
                if item.kind == "syllable" and item.word == asset.word
            ),
            key=lambda item: item.position,
        )
        whole = self.guide_material(word_id)
        return V2WordDetail(
            id=whole.id,
            text=whole.text,
            source="default",
            automatic_evaluation=False,
            syllable_split="-".join(item.target.lower() for item in parts)
            if parts
            else asset.target.lower(),
            level_2=[
                V2Syllable(**self.guide_material(item.item_id).model_dump(), position=item.position)
                for item in parts
            ],
            level_3=V2WordStage(instruction=whole.instruction, videos=whole.videos),
        )

    def default_video(self, item_id: str, required: bool) -> list[VideoReference]:
        binding = DEFAULT_VIDEOS.get(item_id)
        if binding is None or not self.account.has_video(binding.bucket, binding.path):
            if required:
                raise missing_video()
            return []
        return [binding]

    def custom_video(self, column: str, target_id: str) -> list[VideoReference]:
        entries = self.account.rows(
            "custom_videos",
            {"select": "id,word_id,syllable_id,storage_path,sort_order", column: f"eq.{target_id}"},
        )
        if len(entries) != 1:
            raise ApiError(
                422, "INVALID_MATERIAL", "Setiap materi harus memiliki tepat satu video tutorial."
            )
        entry = entries[0]
        other = "syllable_id" if column == "word_id" else "word_id"
        if entry.get(column) != target_id or entry.get(other) is not None:
            raise ApiError(422, "INVALID_MATERIAL", "Video tidak terhubung ke materi yang benar.")
        path = text(entry.get("storage_path"))
        if not path.startswith(self.account.uid + "/"):
            raise ApiError(
                422, "INVALID_MATERIAL", "Video custom harus berada pada folder pemilik."
            )
        if not self.account.has_video(CUSTOM_BUCKET, path):
            raise missing_video()
        return [VideoReference(bucket=CUSTOM_BUCKET, path=path, position=1)]

    def custom_detail(self, word: dict) -> V2WordDetail:
        if word.get("user_id") != self.account.uid or word.get("status") not in (None, "published"):
            raise ApiError(404, "ITEM_NOT_FOUND", "Materi tidak ditemukan.")
        word_id = str(UUID(str(word["id"])))
        label, instruction = text(word.get("word")), text(word.get("instruction"))
        videos = self.custom_video("word_id", word_id)
        parts = self.account.rows(
            "custom_syllables",
            {
                "select": "id,word_id,syllable,instruction,position",
                "word_id": f"eq.{word_id}",
                "order": "position.asc",
            },
        )
        steps: list[V2Syllable] = []
        positions: set[int] = set()
        for part in parts:
            position = part.get("position")
            if (
                part.get("word_id") != word_id
                or type(position) is not int
                or position < 1
                or position in positions
            ):
                raise ApiError(
                    422, "INVALID_MATERIAL", "Urutan suku kata belum lengkap atau berulang."
                )
            positions.add(position)
            part_id = str(UUID(str(part["id"])))
            steps.append(
                V2Syllable(
                    id=f"custom_syllable:{part_id}",
                    text=text(part.get("syllable")),
                    position=position,
                    instruction=text(part.get("instruction")),
                    videos=self.custom_video("syllable_id", part_id),
                )
            )
        return V2WordDetail(
            id=f"custom_word:{word_id}",
            text=label,
            source="custom",
            automatic_evaluation=word.get("status") is None,
            level_2=sorted(steps, key=lambda step: step.position),
            level_3=V2WordStage(instruction=instruction, videos=videos),
        )

    def summary(self) -> V2Catalog:
        basics = []
        words = [
            V2WordSummary(
                id=item.item_id,
                text=item.target,
                source="default",
                automatic_evaluation=False,
                has_level_2=any(
                    part.kind == "syllable" and part.word == item.word
                    for part in GUIDE_ITEMS.values()
                ),
            )
            for item in GUIDE_WORDS
        ]
        for item in self.content.items:
            if (
                not item.active
                or item.item_id in OFFLINE_IDS
                or item.text.casefold() in OFFLINE_WORDS
            ):
                continue
            if item.level in (0, 1):
                basics.append(
                    V2Material(
                        id=item.item_id,
                        text=item.text.upper(),
                        instruction=default_instruction(item.item_id, item.text),
                        videos=self.default_video(item.item_id, False),
                    )
                )
        owned = self.account.rows(
            "custom_words",
            {
                "select": "*",
                "user_id": f"eq.{self.account.uid}",
                "order": "id.asc",
            },
        )
        for word in owned:
            if word.get("user_id") != self.account.uid:
                raise ApiError(
                    503, "DATABASE_UNAVAILABLE", "Kepemilikan materi belum dapat diverifikasi."
                )
            if word.get("status") not in (None, "published"):
                continue
            try:
                detail = self.custom_detail(word)
            except ApiError as exc:
                if exc.code in ("INVALID_MATERIAL", "VIDEO_NOT_FOUND"):
                    continue
                raise
            words.append(
                V2WordSummary(
                    id=detail.id,
                    text=detail.text,
                    source="custom",
                    automatic_evaluation=detail.automatic_evaluation,
                    has_level_2=bool(detail.level_2),
                )
            )
        return V2Catalog(level_1=basics, words=words)

    def word(self, word_id: str) -> V2WordDetail:
        if word_id in GUIDE_ITEMS:
            return self.guide_word(word_id)
        if word_id.startswith("custom_word:"):
            value = custom_uuid(word_id, "custom_word:")
            words = self.account.rows(
                "custom_words",
                {
                    "select": "*",
                    "user_id": f"eq.{self.account.uid}",
                    "id": f"eq.{value}",
                },
            )
            if len(words) != 1:
                raise ApiError(404, "ITEM_NOT_FOUND", "Materi tidak ditemukan.")
            return self.custom_detail(words[0])
        item = self.content.items_by_id.get(word_id)
        if (
            item is None
            or not item.active
            or item.level != 3
            or item.item_id in OFFLINE_IDS
            or item.text.casefold() in OFFLINE_WORDS
        ):
            raise ApiError(404, "ITEM_NOT_FOUND", "Materi tidak ditemukan.")
        parts = []
        for position, unit in enumerate(item.units, 1):
            syllable = next(
                (
                    candidate
                    for candidate in self.content.items
                    if candidate.active and candidate.units == [unit] and candidate.level == 2
                ),
                None,
            )
            if syllable is None:
                raise ApiError(422, "INVALID_MATERIAL", "Tahapan materi ini belum tersedia.")
            parts.append(
                V2Syllable(
                    id=syllable.item_id,
                    text=unit.upper(),
                    position=position,
                    instruction=f"Ucapkan {unit.upper()}.",
                    videos=self.default_video(syllable.item_id, True),
                )
            )
        return V2WordDetail(
            id=item.item_id,
            text=item.text.upper(),
            source="default",
            level_2=parts,
            level_3=V2WordStage(
                instruction=f"Ucapkan {item.text.upper()} secara lengkap.",
                videos=self.default_video(item.item_id, True),
            ),
        )

    def target(self, item_id: str) -> tuple[int, str]:
        item = self.content.items_by_id.get(item_id)
        if (
            item
            and item.active
            and item.level in (0, 1, 2, 3)
            and item.item_id not in OFFLINE_IDS
            and item.text.casefold() not in OFFLINE_WORDS
        ):
            return max(1, item.level), item.text
        if item_id.startswith("custom_word:"):
            word = self.word(item_id)
            if word.automatic_evaluation:
                return 3, word.text
        if item_id.startswith("custom_syllable:"):
            value = custom_uuid(item_id, "custom_syllable:")
            parts = self.account.rows(
                "custom_syllables",
                {
                    "select": "id,word_id,custom_words!inner(user_id)",
                    "id": f"eq.{value}",
                    "custom_words.user_id": f"eq.{self.account.uid}",
                },
            )
            if len(parts) == 1:
                parent = self.word(f"custom_word:{parts[0]['word_id']}")
                part = next((step for step in parent.level_2 if step.id == item_id), None)
                if part and parent.automatic_evaluation:
                    return 2, part.text
        raise ApiError(
            404, "ITEM_NOT_FOUND", "Materi tidak ditemukan atau belum didukung evaluasi."
        )


@router.get("/catalog", response_model=V2Catalog)
def catalog(account: AccountDep, content: ContentDep) -> V2Catalog:
    return Catalogue(account, content).summary()


@router.get("/words/{word_id}", response_model=V2WordDetail)
def word_detail(word_id: str, account: AccountDep, content: ContentDep) -> V2WordDetail:
    return Catalogue(account, content).word(word_id)


@router.get("/items/{item_id}", response_model=V2ItemDetail)
def item_detail(item_id: str, account: AccountDep, content: ContentDep) -> V2ItemDetail:
    catalogue = Catalogue(account, content)
    if item_id in GUIDE_ITEMS:
        material = catalogue.guide_material(item_id)
        return V2ItemDetail(
            **material.model_dump(), level=GUIDE_ITEMS[item_id].level, automatic_evaluation=False
        )
    if item_id.startswith("custom_word:"):
        word = catalogue.word(item_id)
        return V2ItemDetail(
            id=word.id,
            text=word.text,
            level=3,
            instruction=word.level_3.instruction,
            videos=word.level_3.videos,
            automatic_evaluation=word.automatic_evaluation,
        )
    if item_id.startswith("custom_syllable:"):
        level, label = 2, ""
    else:
        level, label = catalogue.target(item_id)
    if level == 3:
        word = catalogue.word(item_id)
        return V2ItemDetail(
            id=item_id,
            text=word.text,
            level=3,
            instruction=word.level_3.instruction,
            videos=word.level_3.videos,
        )
    if item_id.startswith("custom_syllable:"):
        value = custom_uuid(item_id, "custom_syllable:")
        parent = account.rows(
            "custom_syllables",
            {
                "select": "word_id,custom_words!inner(user_id)",
                "id": f"eq.{value}",
                "custom_words.user_id": f"eq.{account.uid}",
            },
        )
        if len(parent) != 1:
            raise ApiError(404, "ITEM_NOT_FOUND", "Materi tidak ditemukan.")
        detail = catalogue.word(f"custom_word:{parent[0]['word_id']}")
        step = next((part for part in detail.level_2 if part.id == item_id), None)
        if step is None:
            raise ApiError(404, "ITEM_NOT_FOUND", "Materi tidak ditemukan.")
        return V2ItemDetail(
            **step.model_dump(exclude={"position"}),
            level=2,
            automatic_evaluation=detail.automatic_evaluation,
        )
    return V2ItemDetail(
        id=item_id,
        text=label.upper(),
        level=level,
        instruction=default_instruction(item_id, label),
        videos=catalogue.default_video(item_id, level == 2),
    )
