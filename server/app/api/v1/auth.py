"""Delete only the Supabase Auth user verified from the caller's bearer token."""

from typing import Annotated
from urllib.parse import urlsplit
from uuid import UUID

import httpx
from fastapi import APIRouter, Header
from pydantic import BaseModel, ValidationError

from app.api.deps import SettingsDep
from app.api.errors import ApiError
from app.api.schemas import AccountDeletionResponse, ErrorResponse
from app.api.v1.prefix import API_PREFIX

router = APIRouter(prefix=API_PREFIX, tags=["auth"])


class _AuthUser(BaseModel):
    id: UUID
    email: str
    is_anonymous: bool


def verify_companion(client: httpx.Client, base: str, key: str, token: str) -> _AuthUser:
    verification = client.get(
        f"{base}/auth/v1/user", headers={"apikey": key, "Authorization": f"Bearer {token}"}
    )
    if verification.status_code in (401, 403):
        raise ApiError(401, "auth_invalid", "Sesi tidak valid. Silakan login kembali.")
    if verification.status_code != 200:
        raise ApiError(503, "auth_unavailable", "Sesi belum dapat diverifikasi. Coba lagi.")
    user = _AuthUser.model_validate(verification.json())
    if user.is_anonymous or not user.email:
        raise ApiError(403, "companion_required", "Gunakan akun pendamping dengan email.")
    return user


@router.delete(
    "/auth/account",
    response_model=AccountDeletionResponse,
    responses={code: {"model": ErrorResponse} for code in (401, 403, 502, 503)},
)
def delete_account(
    settings: SettingsDep,
    authorization: Annotated[str | None, Header()] = None,
) -> AccountDeletionResponse:
    parts = (authorization or "").split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise ApiError(401, "auth_required", "Login akun pendamping diperlukan.")
    base = settings.supabase_url.rstrip("/")
    key = settings.supabase_service_role_key.get_secret_value()
    url = urlsplit(base)
    if not key or url.scheme != "https" or not url.netloc or url.username or url.query:
        raise ApiError(503, "auth_not_configured", "Layanan penghapusan akun belum dikonfigurasi.")
    try:
        # Bounded, no redirects or ambient proxies: credentials stay at the configured Auth origin.
        with httpx.Client(timeout=10, follow_redirects=False, trust_env=False) as client:
            user = verify_companion(client, base, key, parts[1])
            # The owner id comes exclusively from Auth, never from a caller-supplied id or profile.
            deletion = client.request(
                "DELETE",
                f"{base}/auth/v1/admin/users/{user.id}",
                headers={"apikey": key, "Authorization": f"Bearer {key}"},
                json={"should_soft_delete": False},
            )
            if deletion.status_code not in (200, 204):
                raise ApiError(
                    502, "account_delete_failed", "Akun belum berhasil dihapus. Coba lagi."
                )
    except (httpx.HTTPError, ValueError, ValidationError) as exc:
        raise ApiError(
            503, "auth_unavailable", "Layanan akun belum dapat dihubungi. Coba lagi."
        ) from exc
    return AccountDeletionResponse()
