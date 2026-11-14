import json
import re
import subprocess
from collections.abc import Callable
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.v1 import tutorials

UID = "11111111-1111-4111-8111-111111111111"
HEADERS = {"Authorization": "Bearer synthetic-token"}
USER = {"id": UID, "email": "producer@example.test", "is_anonymous": False}


@pytest.fixture
def producer(make_client: Callable[..., TestClient]) -> TestClient:
    return make_client(
        supabase_url="https://storage.example.test",
        supabase_service_role_key="synthetic-secret",
        tutorial_uploader_ids={UID},
    )


@pytest.fixture
def upstream(monkeypatch: pytest.MonkeyPatch) -> dict:
    state = {
        "user": USER.copy(),
        "calls": [],
        "objects": {},
        "auth_status": 200,
        "upload_status": 200,
        "verify_size": None,
        "list_status": 200,
    }

    def handle(request: httpx.Request) -> httpx.Response:
        state["calls"].append(request)
        if request.url.path == "/auth/v1/user":
            return httpx.Response(state["auth_status"], json=state["user"])
        if "/object/list/" in request.url.path:
            prefix = json.loads(request.content)["prefix"]
            return httpx.Response(
                state["list_status"],
                json=[
                    {
                        "id": "object-id",
                        "name": path[len(prefix) :],
                        "metadata": {"size": len(body)},
                    }
                    for path, body in state["objects"].items()
                    if path.startswith(prefix)
                ],
            )
        if "/object/info/" in request.url.path:
            path = request.url.path.split(tutorials.BUCKET + "/", 1)[1]
            return httpx.Response(
                200,
                json={
                    "size": state["verify_size"]
                    if state["verify_size"] is not None
                    else len(state["objects"][path])
                },
            )
        assert request.method == "POST" and request.headers["x-upsert"] == "false"
        assert request.headers["content-type"] == "video/mp4"
        path = request.url.path.split(tutorials.BUCKET + "/", 1)[1]
        if path in state["objects"]:
            return httpx.Response(400, json={"statusCode": "409", "error": "Duplicate"})
        if state["upload_status"] != 200:
            return httpx.Response(state["upload_status"], json={})
        state["objects"][path] = request.content
        return httpx.Response(200, json={"Key": path})

    original = httpx.Client
    monkeypatch.setattr(
        tutorials.httpx,
        "Client",
        lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs),
    )
    return state


def test_manifest_exactly_matches_words_splits_and_source() -> None:
    expected = {
        "tolong": ["to", "long"],
        "polisi": ["po", "li", "si"],
        "api": ["a", "pi"],
        "sakit": ["sa", "kit"],
        "obat": ["o", "bat"],
        "alamat": ["a", "la", "mat"],
        "makan": ["ma", "kan"],
        "haus": [],
    }
    items = tutorials.catalogue()
    assert (
        len(items) == len({i.item_id for i in items}) == len({i.storage_path for i in items}) == 24
    )
    assert sum(len(i.steps) for i in items) == 113
    for word, syllables in expected.items():
        group = [i for i in items if i.word.lower() == word]
        whole = [i for i in group if i.kind == "word"]
        assert len(whole) == 1 and whole[0].storage_path == f"default/words/{word}.mp4"
        assert whole[0].level == 3 and whole[0].position is None
        parts = [i for i in group if i.kind == "syllable"]
        assert [i.target.lower() for i in parts] == syllables
        for position, part in enumerate(parts, 1):
            assert part.position == position and part.level == 2
            assert (
                part.storage_path
                == f"default/syllables/{word}/{position:02}-{syllables[position - 1]}.mp4"
            )
    source = Path(__file__).resolve().parents[2] / "KATA_PENTING_LANDASAN_DAN_INSTRUKSI.md"
    if source.exists():
        ui_steps = re.findall(r"^\| \d+ \| (.*?) \|", source.read_text("utf-8"), re.M)
        assert all(step in ui_steps for item in items for step in item.steps)


def test_catalogue_checks_storage_and_does_not_write(producer: TestClient, upstream: dict) -> None:
    upstream["objects"]["default/words/tolong.mp4"] = b"synthetic"
    response = producer.get("/v1/tutorials", headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 24 and sum(i["present"] for i in body["items"]) == 1
    assert body["max_duration_s"] == 120 and body["max_upload_mb"] == 50
    assert len(upstream["calls"]) == 9


@pytest.mark.parametrize(
    "kind,status",
    [("missing", 401), ("expired", 401), ("anonymous", 403), ("other", 403), ("unavailable", 503)],
)
def test_unauthorized_never_touches_storage(
    producer: TestClient, upstream: dict, kind: str, status: int
) -> None:
    if kind == "expired":
        upstream["auth_status"] = 401
    if kind == "unavailable":
        upstream["auth_status"] = 503
    if kind == "anonymous":
        upstream["user"]["is_anonymous"] = True
    if kind == "other":
        upstream["user"]["id"] = "22222222-2222-4222-8222-222222222222"
    response = producer.get("/v1/tutorials", headers={} if kind == "missing" else HEADERS)
    assert response.status_code == status
    assert all(r.url.path == "/auth/v1/user" for r in upstream["calls"])


def test_empty_allowlist_denies_valid_account(
    make_client: Callable[..., TestClient], upstream: dict
) -> None:
    client = make_client(
        supabase_url="https://storage.example.test", supabase_service_role_key="synthetic-secret"
    )
    assert client.get("/v1/tutorials", headers=HEADERS).status_code == 403


def test_storage_failure_does_not_claim_all_missing(producer: TestClient, upstream: dict) -> None:
    upstream["list_status"] = 403
    response = producer.get("/v1/tutorials", headers=HEADERS)
    assert response.status_code == 503 and "items" not in response.json()


def test_upload_converts_full_video_verifies_size_and_cleans_temporary_files(
    producer: TestClient,
    upstream: dict,
    sample_video: bytes,
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    producer.app.state.settings.tmp_dir = tmp_path
    response = producer.post(
        "/v1/tutorials/kp_tolong_to/video",
        headers=HEADERS,
        files={"file": ("private-source.mov", sample_video, "video/quicktime")},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert (
        result["status"] == "verified"
        and result["storage_path"] == "default/syllables/tolong/01-to.mp4"
    )
    assert result["size_bytes"] == len(upstream["objects"][result["storage_path"]])
    assert list(tmp_path.iterdir()) == []
    assert "synthetic-token" not in caplog.text and "synthetic-secret" not in caplog.text
    assert "private-source" not in caplog.text and "default/syllables" not in caplog.text


@pytest.fixture
def fake_conversion(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        tutorials,
        "convert_video",
        lambda source, output, config: output.write_bytes(b"synthetic-output"),
    )


@pytest.mark.parametrize(
    "kind,expected", [("duplicate", 409), ("upload_failed", 502), ("not_verified", 502)]
)
def test_failed_upload_is_not_success(
    producer: TestClient,
    upstream: dict,
    fake_conversion: None,
    sample_video: bytes,
    tmp_path: Path,
    kind: str,
    expected: int,
) -> None:
    producer.app.state.settings.tmp_dir = tmp_path
    if kind == "duplicate":
        upstream["objects"]["default/words/haus.mp4"] = b"original"
    if kind == "upload_failed":
        upstream["upload_status"] = 500
    if kind == "not_verified":
        upstream["verify_size"] = 1
    result = producer.post(
        "/v1/tutorials/kp_haus/video",
        headers=HEADERS,
        files={"file": ("clip.mp4", sample_video, "video/mp4")},
    )
    assert result.status_code == expected and result.json().get("status") != "verified"
    if kind == "duplicate":
        assert upstream["objects"]["default/words/haus.mp4"] == b"original"
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize(
    "target,content,mime,status",
    [
        ("not_in_catalogue", b"anything", "video/mp4", 404),
        ("kp_haus", b"not-video", "video/mp4", 415),
        ("kp_haus", b"", "video/mp4", 422),
    ],
)
def test_invalid_upload_never_writes(
    producer: TestClient, upstream: dict, target: str, content: bytes, mime: str, status: int
) -> None:
    result = producer.post(
        f"/v1/tutorials/{target}/video",
        headers=HEADERS,
        files={"file": ("clip.mp4", content, mime)},
    )
    assert result.status_code == status and upstream["objects"] == {}


def test_recordings_longer_than_practice_are_not_cut(
    make_clip: Callable[..., Path], tmp_path: Path
) -> None:
    source, output = make_clip(duration=6), tmp_path / "output.mp4"
    from app.core.thresholds import get_thresholds

    tutorials.convert_video(source, output, get_thresholds().tutorials)
    _, probe = tutorials.find_tools()
    result = subprocess.run(
        [probe, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(output)],
        capture_output=True,
        check=True,
        timeout=20,
    )
    assert abs(float(json.loads(result.stdout)["format"]["duration"]) - 6) < 0.1
    config = get_thresholds().tutorials.model_copy(update={"max_duration_s": 1})
    with pytest.raises(tutorials.ApiError, match="tutorial_duration"):
        tutorials.convert_video(source, tmp_path / "too-long.mp4", config)


def test_silent_video_rejected_before_storage_write(
    producer: TestClient, upstream: dict, make_clip: Callable[..., Path]
) -> None:
    video = make_clip(audio=None)
    response = producer.post(
        "/v1/tutorials/kp_haus/video",
        headers=HEADERS,
        files={"file": ("clip.mp4", video.read_bytes(), "video/mp4")},
    )
    assert response.status_code == 422 and upstream["objects"] == {}


def test_tutorial_limit_does_not_increase_practice_limit(producer: TestClient) -> None:
    headers = {"Content-Length": str(16 * 1024 * 1024 + 1)}
    assert producer.post("/v1/analyze", headers=headers).status_code == 413
    assert producer.post("/v1/tutorials/kp_haus/video", headers=headers).status_code != 413
    headers["Content-Length"] = str(51 * 1024 * 1024 + 1)
    assert producer.post("/v1/tutorials/kp_haus/video", headers=headers).status_code == 413
