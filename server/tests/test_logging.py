import logging

import pytest
from fastapi.testclient import TestClient

from app.core.logging import ACCESS_LOGGER_NAME
from tests.conftest import SECRET_FILENAME, video_file


def _messages(caplog: pytest.LogCaptureFixture) -> list[str]:
    # httpx is the test client (not the server) and logs its own request URL.
    return [r.getMessage() for r in caplog.records if not r.name.startswith("httpx")]


def test_access_log_has_only_method_route_status_duration(
    client: TestClient, sample_video: bytes, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO, logger=ACCESS_LOGGER_NAME)
    client.post(
        "/v1/analyze?mock=merah",
        data={"user_id": "user-secret-42", "item_id": "l3_mama", "session_id": "sess-secret"},
        files=video_file(sample_video),
    )
    client.get("/v1/model-video/l3_mama")

    messages = _messages(caplog)
    assert any(m.startswith("POST /v1/analyze 200 ") and m.endswith("ms") for m in messages)
    # Route template, not the concrete path.
    assert any(m.startswith("GET /v1/model-video/{item_id} 404 ") for m in messages)

    text = "\n".join(messages)
    for secret in (SECRET_FILENAME, "user-secret-42", "sess-secret", "mock=", "testclient"):
        assert secret not in text


def test_dataset_upload_log_has_no_paths(
    make_client, sample_video: bytes, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    client = make_client(dataset_mode=True)
    client.post(
        "/v1/dataset/upload",
        data={
            "purpose": "dataset", "speaker_id": "S02", "item_id": "l2_pa", "rep": "3",
            "intended_error": "none", "condition": "noisy", "session_id": "s9",
        },
        files=video_file(sample_video),
    )  # fmt: skip
    text = "\n".join(_messages(caplog))
    assert "POST /v1/dataset/upload 200" in text
    for secret in (SECRET_FILENAME, "S02", "l2_pa", ".mp4", "raw"):
        assert secret not in text


def test_unhandled_error_is_generic_and_not_leaked(
    make_client, caplog: pytest.LogCaptureFixture
) -> None:
    client = make_client()

    def boom() -> None:
        raise RuntimeError("failed reading C:/data/raw/S01/l3_mama__r1__none__quiet.mp4")

    client.app.add_api_route("/v1/_boom", boom)
    caplog.set_level(logging.DEBUG)
    res = client.get("/v1/_boom")

    assert res.status_code == 500
    assert res.json()["detail"]["code"] == "internal_error"
    assert "S01" not in res.text
    text = "\n".join(_messages(caplog))
    assert "unhandled_error type=RuntimeError" in text
    assert "GET /v1/_boom 500" in text
    assert "S01" not in text and ".mp4" not in text


def test_unmatched_route_is_not_logged_verbatim(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO, logger=ACCESS_LOGGER_NAME)
    client.get("/v1/some/private-name.mp4")
    text = "\n".join(_messages(caplog))
    assert "GET <unmatched> 404" in text
    assert "private-name" not in text
