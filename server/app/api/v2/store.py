"""Supabase access under the verified caller JWT, so database and Storage RLS still apply."""

from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Annotated
from urllib.parse import quote, urlsplit
from uuid import UUID

import httpx
from fastapi import Depends, Header

from app.api.deps import SettingsDep
from app.api.errors import ApiError
from app.api.v1.auth import verify_companion


@dataclass
class AccountStore:
    uid: str
    client: httpx.Client
    objects: dict[tuple[str, str], bool] = field(default_factory=dict)

    def rows(self, table: str, params: dict[str, str]) -> list[dict]:
        result: list[dict] = []
        for offset in range(0, 100_000, 200):
            response = self.client.get(
                f"/rest/v1/{table}", params={**params, "limit": "200", "offset": str(offset)}
            )
            if response.status_code == 401:
                raise ApiError(401, "UNAUTHENTICATED", "Sesi berakhir. Silakan login kembali.")
            if response.status_code != 200:
                raise ApiError(503, "DATABASE_UNAVAILABLE", "Materi belum dapat dimuat. Coba lagi.")
            page = response.json()
            if not isinstance(page, list) or any(not isinstance(row, dict) for row in page):
                raise ApiError(
                    503, "DATABASE_UNAVAILABLE", "Format data materi tidak dapat dibaca."
                )
            result.extend(page)
            if len(page) < 200:
                return result
        raise ApiError(503, "DATABASE_UNAVAILABLE", "Daftar materi terlalu besar untuk dimuat.")

    def has_video(self, bucket: str, path: str) -> bool:
        if (
            not path
            or path.startswith("/")
            or "\\" in path
            or any(part in ("", ".", "..") for part in path.split("/"))
        ):
            return False
        if bucket == "rekan-wicara-tutorials" and not path.startswith((self.uid + "/", "default/")):
            return False
        key = (bucket, path)
        if key not in self.objects:
            response = self.client.get(f"/storage/v1/object/info/{bucket}/{quote(path, safe='/')}")
            missing = response.status_code == 404
            if response.status_code == 400:
                body = response.json()
                missing = isinstance(body, dict) and body.get("code") in (
                    "NoSuchKey",
                    "NoSuchBucket",
                )
            if missing:
                self.objects[key] = False
            elif response.status_code == 200:
                info = response.json()
                if not isinstance(info, dict):
                    raise ApiError(503, "STORAGE_UNAVAILABLE", "Metadata video tidak dapat dibaca.")
                size = info.get("size")
                self.objects[key] = isinstance(size, int) and size > 0
            else:
                raise ApiError(
                    503, "STORAGE_UNAVAILABLE", "Video belum dapat diperiksa. Coba lagi."
                )
        return self.objects[key]


def account_store(
    settings: SettingsDep, authorization: Annotated[str | None, Header()] = None
) -> Iterator[AccountStore]:
    parts = (authorization or "").split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise ApiError(401, "UNAUTHENTICATED", "Login akun pendamping diperlukan.")
    base = settings.supabase_url.rstrip("/")
    url = urlsplit(base)
    key = settings.supabase_anon_key.get_secret_value()
    if (
        url.scheme != "https"
        or not url.netloc
        or url.username
        or url.query
        or url.fragment
        or not key
    ):
        raise ApiError(503, "AUTH_UNAVAILABLE", "Koneksi akun belum dikonfigurasi di server.")
    try:
        with httpx.Client(
            base_url=base,
            headers={"apikey": key, "Authorization": f"Bearer {parts[1]}"},
            timeout=15,
            follow_redirects=False,
            trust_env=False,
        ) as client:
            try:
                user = verify_companion(client, base, key, parts[1])
            except ApiError as exc:
                raise ApiError(
                    exc.status_code,
                    "UNAUTHENTICATED"
                    if exc.status_code == 401
                    else "FORBIDDEN"
                    if exc.status_code == 403
                    else "AUTH_UNAVAILABLE",
                    exc.message,
                ) from exc
            yield AccountStore(str(user.id), client)
    except (httpx.HTTPError, ValueError, TypeError, KeyError) as exc:
        raise ApiError(
            503, "SERVICE_UNAVAILABLE", "Layanan materi belum dapat dihubungi. Coba lagi."
        ) from exc


def custom_uuid(item_id: str, prefix: str) -> str:
    try:
        if not item_id.startswith(prefix):
            raise ValueError
        return str(UUID(item_id[len(prefix) :]))
    except ValueError as exc:
        raise ApiError(404, "ITEM_NOT_FOUND", "Materi tidak ditemukan.") from exc


AccountDep = Annotated[AccountStore, Depends(account_store)]
