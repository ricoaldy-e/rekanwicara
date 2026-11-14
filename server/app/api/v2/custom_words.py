"""Manual word trees: caller-JWT transactions and retryable owner-only Storage cleanup."""

from collections import Counter
from dataclasses import dataclass
from urllib.parse import quote
from uuid import UUID

import httpx
from fastapi import APIRouter, Query

from app.api.deps import ThresholdsDep
from app.api.errors import ApiError
from app.api.schemas import (
    CustomSyllableDetail,
    CustomWordDeletion,
    CustomWordDetail,
    CustomWordList,
    CustomWordSummary,
    CustomWordWrite,
    VideoReference,
)
from app.api.v2.catalog import CUSTOM_BUCKET
from app.api.v2.store import AccountDep, AccountStore
from app.content.loader import FORBIDDEN_WORDS

router = APIRouter(prefix="/v2/custom-words", tags=["custom-words"])
SELECT = "id,user_id,word,instruction,status,revision,pending_video_paths"
MIGRATION_CODES = {"42703", "42883", "PGRST202", "PGRST204"}
ERROR_MESSAGES = {
    "ITEM_NOT_FOUND": "Kata tidak ditemukan.",
    "REVISION_CONFLICT": "Kata sudah berubah. Muat ulang sebelum menyimpan lagi.",
    "CLEANUP_PENDING": "Pembersihan video belum selesai. Coba ulang pembersihan.",
    "INCOMPLETE_MATERIAL": "Lengkapi instruksi dan video seluruh materi sebelum menyimpan.",
    "INVALID_MATERIAL": "Materi belum sesuai. Periksa instruksi dan hubungan video.",
    "FORBIDDEN": "Akun ini tidak boleh mengubah materi tersebut.",
    "INVALID_INPUT": "Periksa kata dan urutan suku kata.",
}


def database_error(response: httpx.Response) -> ApiError:
    body = response.json()
    code = body.get("code") if isinstance(body, dict) else None
    if code in MIGRATION_CODES:
        return ApiError(
            503, "SCHEMA_MIGRATION_REQUIRED", "Fitur kata manual menunggu migrasi database."
        )
    message = body.get("message") if isinstance(body, dict) else None
    if message in ERROR_MESSAGES:
        return ApiError(response.status_code, message, ERROR_MESSAGES[message])
    if code == "23505":
        return ApiError(409, "REVISION_CONFLICT", ERROR_MESSAGES["REVISION_CONFLICT"])
    if response.status_code in (401, 403):
        return ApiError(response.status_code, "FORBIDDEN", ERROR_MESSAGES["FORBIDDEN"])
    return ApiError(503, "DATABASE_UNAVAILABLE", "Perubahan belum dapat disimpan. Coba lagi.")


@dataclass
class ManualWords:
    account: AccountStore

    def rows(self, params: dict[str, str]) -> list[dict]:
        # Explicit migration errors instead of silently storing publication on the phone.
        rows = []
        for offset in range(0, 100_000, 200):
            result = self.account.client.get(
                "/rest/v1/custom_words", params={**params, "limit": "200", "offset": str(offset)}
            )
            if result.status_code != 200:
                raise database_error(result)
            body = result.json()
            if not isinstance(body, list) or any(not isinstance(row, dict) for row in body):
                raise ApiError(503, "DATABASE_UNAVAILABLE", "Daftar kata belum dapat dibaca.")
            rows.extend(body)
            if len(body) < 200:
                return rows
        raise ApiError(503, "DATABASE_UNAVAILABLE", "Daftar kata terlalu besar untuk dimuat.")

    def owned(self, word_id: UUID) -> dict:
        rows = self.rows(
            {"select": SELECT, "id": f"eq.{word_id}", "user_id": f"eq.{self.account.uid}"}
        )
        if len(rows) != 1 or rows[0].get("user_id") != self.account.uid:
            raise ApiError(404, "ITEM_NOT_FOUND", ERROR_MESSAGES["ITEM_NOT_FOUND"])
        return rows[0]

    def rpc(self, action: str, word_id: UUID, **kwargs: object) -> None:
        response = self.account.client.post(
            "/rest/v1/rpc/manage_custom_word",
            json={"p_action": action, "p_id": str(word_id), **kwargs},
        )
        if response.status_code != 200:
            raise database_error(response)
        result = response.json()
        if not isinstance(result, dict) or result.get("id") != str(word_id):
            raise ApiError(
                503, "DATABASE_UNAVAILABLE", "Hasil penyimpanan belum dapat diverifikasi."
            )

    def video(self, column: str, target_id: str) -> VideoReference | None:
        entries = self.account.rows(
            "custom_videos",
            {"select": "word_id,syllable_id,storage_path", column: f"eq.{target_id}"},
        )
        if not entries:
            return None
        other = "syllable_id" if column == "word_id" else "word_id"
        if (
            len(entries) != 1
            or entries[0].get(column) != target_id
            or entries[0].get(other) is not None
        ):
            raise ApiError(422, "INVALID_MATERIAL", ERROR_MESSAGES["INVALID_MATERIAL"])
        path = entries[0].get("storage_path")
        if not isinstance(path, str) or not path.startswith(self.account.uid + "/"):
            raise ApiError(422, "INVALID_MATERIAL", ERROR_MESSAGES["INVALID_MATERIAL"])
        return VideoReference(
            bucket=CUSTOM_BUCKET,
            path=path,
            position=1,
            available=self.account.has_video(CUSTOM_BUCKET, path),
        )

    def detail(self, row: dict) -> CustomWordDetail:
        if row.get("user_id") != self.account.uid:
            raise ApiError(404, "ITEM_NOT_FOUND", ERROR_MESSAGES["ITEM_NOT_FOUND"])
        parts = self.account.rows(
            "custom_syllables",
            {
                "select": "id,word_id,syllable,instruction,position",
                "word_id": f"eq.{row['id']}",
                "order": "position.asc",
            },
        )
        if any(part.get("word_id") != row["id"] for part in parts):
            raise ApiError(
                503, "DATABASE_UNAVAILABLE", "Kepemilikan materi belum dapat diverifikasi."
            )
        return CustomWordDetail(
            id=row["id"],
            word=row["word"],
            instruction=row["instruction"],
            status=row["status"],
            revision=row["revision"],
            cleanup_pending=bool(row["pending_video_paths"]),
            video=self.video("word_id", row["id"]),
            syllables=[
                CustomSyllableDetail(
                    id=p["id"],
                    text=p["syllable"],
                    instruction=p["instruction"],
                    position=p["position"],
                    video=self.video("syllable_id", p["id"]),
                )
                for p in sorted(parts, key=lambda p: p["position"])
            ],
        )

    def save(
        self, word_id: UUID, payload: CustomWordWrite, create: bool = False
    ) -> CustomWordDetail:
        if payload.id is not None and payload.id != word_id:
            raise ApiError(422, "INVALID_INPUT", "ID kata tidak sesuai.")
        if payload.status != "published":
            raise ApiError(
                422, "INVALID_INPUT", "Simpan Kata dilakukan setelah rekaman selesai diunggah."
            )
        if not payload.video or any(not part.video for part in payload.syllables):
            raise ApiError(422, "INCOMPLETE_MATERIAL", ERROR_MESSAGES["INCOMPLETE_MATERIAL"])
        if not create:
            self.owned(word_id)
            if payload.revision is None:
                raise ApiError(422, "INVALID_INPUT", "Revisi kata wajib disertakan saat menyimpan.")
        candidates = [
            (
                payload.video_path,
                f"{self.account.uid}/words/{word_id}/word/",
                "word_id",
                str(word_id),
            )
        ]
        candidates.extend(
            (
                part.video_path,
                f"{self.account.uid}/words/{word_id}/syllables/{part.id}/",
                "syllable_id",
                str(part.id),
            )
            for part in payload.syllables
        )
        for path, prefix, column, material_id in candidates:
            if path is None:
                binding = None if create else self.video(column, material_id)
                if binding is None or not binding.available:
                    raise ApiError(
                        422, "INCOMPLETE_MATERIAL", ERROR_MESSAGES["INCOMPLETE_MATERIAL"]
                    )
                continue  # RPC retains the exact existing binding under the revision lock.
            try:
                recording = UUID(path.removeprefix(prefix).removesuffix(".mp4"))
            except ValueError:
                recording = None
            if recording is None or path != f"{prefix}{recording}.mp4":
                raise ApiError(
                    422, "INVALID_MATERIAL", "Gunakan path rekaman berversi untuk materi ini."
                )
            if not self.account.has_video(CUSTOM_BUCKET, path):
                raise ApiError(422, "INCOMPLETE_MATERIAL", ERROR_MESSAGES["INCOMPLETE_MATERIAL"])
        for value in [
            payload.word,
            payload.instruction,
            *(p.text for p in payload.syllables),
            *(p.instruction for p in payload.syllables),
        ]:
            if any(word in value.casefold() for word in FORBIDDEN_WORDS):
                raise ApiError(
                    422, "INVALID_INPUT", "Gunakan instruksi latihan pelafalan yang sesuai."
                )
        if not payload.word.strip() or any(not part.text.strip() for part in payload.syllables):
            raise ApiError(422, "INVALID_INPUT", "Kata dan suku kata tidak boleh kosong.")
        # The hardened RPC validates JWT ownership and Storage before committing the whole tree.
        self.rpc(
            "create" if create else "save",
            word_id,
            p_revision=payload.revision,
            p_payload=payload.model_dump(mode="json", exclude={"revision", "id"}),
        )
        self.cleanup(word_id)
        return self.detail(self.owned(word_id))

    def cleanup(self, word_id: UUID) -> bool:
        cleaned = []
        try:
            row = self.owned(word_id)
            paths = row["pending_video_paths"]
            if not paths:
                return True
            for path in paths:
                if (
                    not isinstance(path, str)
                    or not path.startswith(self.account.uid + "/")
                    or any(part in ("", ".", "..") for part in path.split("/"))
                    or "\\" in path
                ):
                    return False
                response = self.account.client.request(
                    "DELETE", f"/storage/v1/object/{CUSTOM_BUCKET}", json={"prefixes": [path]}
                )
                if response.status_code != 200:
                    return False
                # An empty DELETE result can mean RLS denied deletion; verify actual absence.
                verify = self.account.client.get(
                    f"/storage/v1/object/info/{CUSTOM_BUCKET}/{quote(path, safe='/')}"
                )
                if verify.status_code == 200:
                    return False
                if verify.status_code != 404 and not (
                    verify.status_code == 400 and verify.json().get("code") == "NoSuchKey"
                ):
                    return False
                cleaned.append(path)
            self.rpc("cleanup", word_id, p_cleaned=cleaned)
            return True
        except (httpx.HTTPError, ApiError, ValueError):
            # The durable queue remains on the word, including during a retried DELETE.
            return False


@router.get("", response_model=CustomWordList)
def list_words(account: AccountDep, thresholds: ThresholdsDep) -> CustomWordList:
    service = ManualWords(account)
    rows = service.rows(
        {"select": SELECT, "user_id": f"eq.{account.uid}", "order": "created_at.desc,id.asc"}
    )
    if any(row.get("user_id") != account.uid for row in rows):
        raise ApiError(503, "DATABASE_UNAVAILABLE", "Kepemilikan kata belum dapat diverifikasi.")
    owned_ids = {row["id"] for row in rows}
    parts = (
        account.rows(
            "custom_syllables",
            {
                "select": "word_id,custom_words!inner(user_id)",
                "custom_words.user_id": f"eq.{account.uid}",
            },
        )
        if rows
        else []
    )
    counts = Counter(part["word_id"] for part in parts if part.get("word_id") in owned_ids)
    return CustomWordList(
        words=[
            CustomWordSummary(
                id=row["id"],
                word=row["word"],
                status=row["status"],
                revision=row["revision"],
                syllable_count=counts[row["id"]],
                cleanup_pending=bool(row["pending_video_paths"]),
            )
            for row in rows
        ],
        max_upload_mb=thresholds.tutorials.max_upload_mb,
        max_duration_s=thresholds.tutorials.max_duration_s,
    )


@router.post("", response_model=CustomWordDetail, status_code=201)
def create_word(payload: CustomWordWrite, account: AccountDep) -> CustomWordDetail:
    if payload.id is None:
        raise ApiError(422, "INVALID_INPUT", "ID kata diperlukan untuk menghubungkan rekaman.")
    return ManualWords(account).save(payload.id, payload, create=True)


@router.get("/{word_id}", response_model=CustomWordDetail)
def get_word(word_id: UUID, account: AccountDep) -> CustomWordDetail:
    service = ManualWords(account)
    return service.detail(service.owned(word_id))


@router.patch("/{word_id}", response_model=CustomWordDetail)
def update_word(word_id: UUID, payload: CustomWordWrite, account: AccountDep) -> CustomWordDetail:
    return ManualWords(account).save(word_id, payload)


@router.post("/{word_id}/cleanup", response_model=CustomWordDetail)
def cleanup_word(word_id: UUID, account: AccountDep) -> CustomWordDetail:
    service = ManualWords(account)
    service.cleanup(word_id)
    return service.detail(service.owned(word_id))


@router.delete("/{word_id}", response_model=CustomWordDeletion)
def delete_word(
    word_id: UUID, account: AccountDep, revision: int = Query(ge=1)
) -> CustomWordDeletion:
    service = ManualWords(account)
    row = service.owned(word_id)
    if row["revision"] != revision:
        raise ApiError(409, "REVISION_CONFLICT", ERROR_MESSAGES["REVISION_CONFLICT"])
    if row["status"] != "deleting":
        service.rpc("begin_delete", word_id, p_revision=revision)
    if not service.cleanup(word_id):
        return CustomWordDeletion(id=word_id, status="cleanup_pending")
    service.rpc("finish_delete", word_id)
    return CustomWordDeletion(id=word_id, status="deleted")
