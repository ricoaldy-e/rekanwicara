"""/labeler (SPEC §10.5): access rules, no leaks to the annotator, saving, resuming, playing."""

import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api import labeler
from app.core.logging import ACCESS_LOGGER_NAME
from app.core.settings import Settings
from app.main import create_app
from tests.dataset_helpers import ROWS, clip_id, make_dataset


@pytest.fixture
def client(data_dir: Path, sample_video: bytes) -> TestClient:
    make_dataset(data_dir, sample_video)
    return TestClient(
        create_app(Settings(_env_file=None, mock_mode=True, dataset_mode=True, data_dir=data_dir))
    )


def clips(client: TestClient, annotator: str) -> dict:
    res = client.get("/labeler/api/clips", params={"annotator": annotator})
    assert res.status_code == 200, res.text
    return res.json()


def token_of(client: TestClient, annotator: str, cid: str) -> str:
    """The token of a clip: look it up through the same mapping the page uses."""
    return labeler._token(cid)


def test_absent_when_dataset_mode_is_off(data_dir: Path, sample_video: bytes) -> None:
    make_dataset(data_dir, sample_video)
    off = TestClient(
        create_app(Settings(_env_file=None, mock_mode=True, dataset_mode=False, data_dir=data_dir))
    )
    assert off.get("/labeler").status_code == 404
    assert off.get("/labeler/api/clips", params={"annotator": "P1"}).status_code == 404


def test_page_is_served(client: TestClient) -> None:
    res = client.get("/labeler")
    assert res.status_code == 200 and "Cek label" in res.text
    assert res.headers["cache-control"] == "no-store"


def test_only_the_server_laptop_can_use_it(data_dir: Path, sample_video: bytes) -> None:
    make_dataset(data_dir, sample_video)
    app = create_app(Settings(_env_file=None, mock_mode=True, dataset_mode=True, data_dir=data_dir))
    phone = TestClient(app, client=("192.168.1.50", 5000), base_url="http://192.168.1.20:8000")
    res = phone.get("/labeler")
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "labeler_local_only"
    assert phone.get("/labeler/api/clips", params={"annotator": "P1"}).status_code == 403
    # Opening the page through the laptop's own LAN address is still the laptop.
    own = TestClient(app, client=("192.168.1.20", 5000), base_url="http://192.168.1.20:8000")
    assert own.get("/labeler").status_code == 200


def test_never_lists_the_annotators_own_clips(client: TestClient) -> None:
    for annotator, others in (("P1", 4), ("P2", 4), ("P3", 4)):
        data = clips(client, annotator)
        assert data["total"] == others and data["done"] == 0
    p1_tokens = {c["token"] for c in clips(client, "P1")["clips"]}
    own = {labeler._token(clip_id(r)) for r in ROWS if r[0] == "P1"}
    assert not (p1_tokens & own)


def test_annotator_sees_nothing_that_gives_the_answer_away(client: TestClient) -> None:
    res = client.get("/labeler/api/clips", params={"annotator": "P1"})
    text = res.text
    for secret in (
        "mama_as_papa",
        "u_flat_lips",
        "bad_noise",
        "intended",
        "speaker",
        "P2__",
        "P3__",
        ".mp4",
        "quiet",
        "noisy",
    ):
        assert secret not in text, secret
    assert set(res.json()["clips"][0]) == {"token", "item_id", "item_text", "emoji", "label"}
    for key in ("status", "overall", "units", "score", "hint_id", "quality_flags"):
        assert key not in text  # no machine result of any kind


def test_order_is_fixed_per_annotator(client: TestClient) -> None:
    first = [c["token"] for c in clips(client, "P2")["clips"]]
    assert first == [c["token"] for c in clips(client, "P2")["clips"]]


def test_unknown_annotator_is_rejected(client: TestClient) -> None:
    assert client.get("/labeler/api/clips", params={"annotator": "P9"}).status_code == 422


def post(client: TestClient, **over) -> dict:
    body = {
        "annotator": "P2",
        "token": labeler._token(clip_id(ROWS[0])),
        "matches_request": True,
        **over,
    }
    return client.post("/labeler/api/labels", json=body)


def test_saved_label_is_written_counted_and_resumed(client: TestClient, data_dir: Path) -> None:
    res = post(client, heard_label="l1_a", lips_wrong=True, quality_ok=False, notes="ok")
    assert res.status_code == 200 and res.json() == {"total": 4, "done": 1}

    data = clips(client, "P2")
    saved = next(c for c in data["clips"] if c["token"] == labeler._token(clip_id(ROWS[0])))
    assert saved["label"] == {
        "matches_request": True,
        "heard_label": "l1_a",
        "lips_wrong": True,
        "quality_ok": False,
        "notes": "ok",
    }
    assert data["done"] == 1

    again = post(client, matches_request=False)  # changing your mind replaces the label
    assert again.json()["done"] == 1
    lines = (data_dir / "labels" / "labels_P2.csv").read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 2  # header + one row
    assert lines[0] == "clip_id,annotator,matches_request,heard_label,lips_wrong,quality_ok,notes"


@pytest.mark.parametrize(
    ("over", "status", "code"),
    [
        ({"annotator": "P1"}, 422, "own_clip"),  # P1 recorded this clip
        ({"annotator": "P9"}, 422, "invalid_annotator"),
        ({"token": "0" * 16}, 404, "not_found"),
        ({"heard_label": "l9_zzz"}, 422, "invalid_heard_label"),
        ({"notes": "x" * 201}, 422, "invalid_request"),
        ({"surprise": 1}, 422, "invalid_request"),
    ],
)
def test_bad_labels_are_rejected(client: TestClient, data_dir: Path, over, status, code) -> None:
    res = post(client, **over)
    assert res.status_code == status
    assert res.json()["detail"]["code"] == code
    assert not (data_dir / "labels").exists()


def test_video_is_served_as_h264(client: TestClient, data_dir: Path, sample_video: bytes) -> None:
    token = labeler._token(clip_id(ROWS[0]))
    res = client.get(f"/labeler/video/{token}")
    assert res.status_code == 200 and res.headers["content-type"] == "video/mp4"
    assert res.content.startswith(b"\x00\x00\x00") and b"ftyp" in res.content[:16]
    assert (data_dir / "processed" / "labeler_cache" / f"{token}.mp4").is_file()  # converted once


def test_video_falls_back_to_the_original_without_ffmpeg(
    client: TestClient, sample_video: bytes, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(shutil, "which", lambda _name: None)
    res = client.get(f"/labeler/video/{labeler._token(clip_id(ROWS[1]))}")
    assert res.status_code == 200 and res.content == sample_video


@pytest.mark.parametrize("token", ["0" * 16, "..%2F..%2Fmetadata.csv", "not-a-token"])
def test_video_of_an_unknown_token_is_404(client: TestClient, token: str) -> None:
    assert client.get(f"/labeler/video/{token}").status_code == 404


def test_access_log_does_not_contain_the_token(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level("DEBUG")
    token = labeler._token(clip_id(ROWS[0]))
    client.get(f"/labeler/video/{token}")
    # The server's own log (not the test client's httpx log) names the route, never the token.
    access = [r.getMessage() for r in caplog.records if r.name == ACCESS_LOGGER_NAME]
    assert access and all(token not in line for line in access)
    assert any("/labeler/video/{token}" in line for line in access)


def test_label_file_is_valid_csv_after_many_saves(client: TestClient, data_dir: Path) -> None:
    for r in ROWS:
        if r[0] != "P3":
            client.post(
                "/labeler/api/labels",
                json={
                    "annotator": "P3",
                    "token": labeler._token(clip_id(r)),
                    "matches_request": r[3] == "none",
                },
            )
    rows = (data_dir / "labels" / "labels_P3.csv").read_text(encoding="utf-8").strip().splitlines()
    assert len(rows) == 1 + 4
    json.dumps(rows)  # plain text, nothing binary
