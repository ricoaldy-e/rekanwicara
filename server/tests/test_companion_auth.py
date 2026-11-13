from collections.abc import Callable

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.v1 import auth

UID = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
TOKEN = "fixture-access-token"
SECRET = "fixture-server-secret"
URL = "/v1/auth/account"
USER = {"id": UID, "email": "companion@example.test", "is_anonymous": False}


@pytest.fixture
def upstream(monkeypatch: pytest.MonkeyPatch) -> list[httpx.Request]:
    calls: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.method == "GET":
            return httpx.Response(200, json=USER)
        return httpx.Response(200, json={})

    original = httpx.Client
    transport = httpx.MockTransport(handle)
    monkeypatch.setattr(
        auth.httpx, "Client", lambda **kwargs: original(transport=transport, **kwargs)
    )
    return calls


def test_delete_uses_verified_owner_not_request_id(
    make_client: Callable[..., TestClient],
    upstream: list[httpx.Request],
    caplog: pytest.LogCaptureFixture,
) -> None:
    client = make_client(supabase_url="https://auth.example.test", supabase_service_role_key=SECRET)
    response = client.request(
        "DELETE", URL, headers={"Authorization": f"Bearer {TOKEN}"}, json={"user_id": OTHER}
    )
    assert response.status_code == 200 and response.json() == {"status": "deleted"}
    assert len(upstream) == 2
    assert upstream[0].url.path == "/auth/v1/user"
    assert upstream[0].headers["authorization"] == f"Bearer {TOKEN}"
    assert upstream[1].method == "DELETE"
    assert upstream[1].url.path == f"/auth/v1/admin/users/{UID}"
    assert upstream[1].headers["authorization"] == f"Bearer {SECRET}"
    assert b'"should_soft_delete":false' in upstream[1].content
    assert TOKEN not in caplog.text and SECRET not in caplog.text
    assert TOKEN not in response.text and SECRET not in response.text


@pytest.mark.parametrize("header", [None, "", "Basic credentials", "Bearer", "Bearer a b"])
def test_missing_or_invalid_bearer_never_reaches_auth(
    client: TestClient, upstream: list[httpx.Request], header: str | None
) -> None:
    response = client.delete(URL, headers={"Authorization": header} if header is not None else {})
    assert response.status_code == 401 and upstream == []


@pytest.mark.parametrize(
    "url,key",
    [("", SECRET), ("http://auth.example.test", SECRET), ("https://auth.example.test", "")],
)
def test_missing_server_config_fails_closed(
    make_client: Callable[..., TestClient], upstream: list[httpx.Request], url: str, key: str
) -> None:
    response = make_client(supabase_url=url, supabase_service_role_key=key).delete(
        URL, headers={"Authorization": f"Bearer {TOKEN}"}
    )
    assert response.status_code == 503 and upstream == []


@pytest.mark.parametrize(
    "kind,status",
    [
        ("invalid_token", 401),
        ("anonymous", 403),
        ("invalid_user", 503),
        ("upstream_error", 503),
        ("delete_error", 502),
        ("timeout", 503),
    ],
)
def test_failed_verification_or_deletion_never_claims_success(
    make_client: Callable[..., TestClient], monkeypatch: pytest.MonkeyPatch, kind: str, status: int
) -> None:
    calls = []

    def handle(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if kind == "timeout":
            raise httpx.ReadTimeout(SECRET, request=request)
        if request.method == "GET":
            if kind == "invalid_token":
                return httpx.Response(401, json={"message": SECRET})
            if kind == "anonymous":
                return httpx.Response(200, json={**USER, "is_anonymous": True})
            if kind == "invalid_user":
                return httpx.Response(200, json={**USER, "id": "../another-user"})
            if kind == "upstream_error":
                return httpx.Response(500, json={"message": SECRET})
            return httpx.Response(200, json=USER)
        return httpx.Response(500, json={"message": SECRET})

    original = httpx.Client
    transport = httpx.MockTransport(handle)
    monkeypatch.setattr(
        auth.httpx, "Client", lambda **kwargs: original(transport=transport, **kwargs)
    )
    response = make_client(
        supabase_url="https://auth.example.test", supabase_service_role_key=SECRET
    ).delete(URL, headers={"Authorization": f"Bearer {TOKEN}"})
    assert response.status_code == status
    assert SECRET not in response.text and TOKEN not in response.text
    assert len(calls) == (2 if kind == "delete_error" else 1)
