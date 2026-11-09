import pytest
from fastapi.testclient import TestClient

from app.api.schemas import AnalyzeResponse, CalibrateResponse
from app.content.loader import FORBIDDEN_WORDS, load_content
from tests.conftest import video_file

CONTENT = load_content()
ALL_ITEM_IDS = [i.item_id for i in CONTENT.items]
SEVERITY = {"hijau": 0, "kuning": 1, "merah": 2}


def _analyze(client: TestClient, video: bytes, item_id: str = "l3_mama", **params: str):
    return client.post(
        "/v1/analyze",
        params=params,
        data={"user_id": "user-123", "item_id": item_id, "session_id": "sess-1"},
        files=video_file(video),
    )


def _assert_no_forbidden_words(text: str) -> None:
    lowered = text.lower()
    for word in FORBIDDEN_WORDS:
        assert word not in lowered


@pytest.mark.parametrize("item_id", ALL_ITEM_IDS)
@pytest.mark.parametrize("variant", ["hijau", "kuning", "merah"])
def test_analyze_mock_is_valid_and_consistent(
    client: TestClient, sample_video: bytes, item_id: str, variant: str
) -> None:
    res = _analyze(client, sample_video, item_id, mock=variant)
    assert res.status_code == 200, res.text
    body = AnalyzeResponse.model_validate(res.json())
    item = CONTENT.items_by_id[item_id]

    assert body.status == "ok"
    assert body.item_id == item_id and body.level == item.level
    assert body.units is not None and body.indicators is not None
    assert [u.target for u in body.units] == item.units
    assert body.overall == variant

    # SPEC §6.8: unit status = worst(bibir, suara); score formula; indicators = worst over units.
    for unit in body.units:
        parts = [s for s in (unit.bibir, unit.suara) if s is not None]
        assert unit.status == max(parts, key=SEVERITY.__getitem__)
        assert unit.end_ms > unit.start_ms
    n = len(body.units)
    expected = sum({"hijau": 1, "kuning": 0.5, "merah": 0}[u.status] for u in body.units) / n
    assert body.score == pytest.approx(expected, abs=1e-3)

    if item.level == 0:
        assert body.indicators.bibir is None
        assert all(u.bibir is None for u in body.units)
        assert body.visuals.loudness is not None
    else:
        assert body.indicators.bibir is not None
        assert body.visuals.lip_contour is not None

    assert body.hint_id in CONTENT.hints
    if variant == "hijau":
        assert body.hint_id == "ok_good"
        assert all(u.reason_code is None for u in body.units)
    else:
        assert body.hint_id != "ok_good"
        assert any(u.reason_code is not None for u in body.units)

    # visuals keys are always present (null when not relevant)
    assert set(res.json()["visuals"]) == {"vowel_point", "vowel_anchors", "lip_contour", "loudness"}
    _assert_no_forbidden_words(res.text)


def test_analyze_spec_example_shape(client: TestClient, sample_video: bytes) -> None:
    body = _analyze(client, sample_video, "l3_mama", mock="merah").json()
    assert body["units"][1]["reason_code"] == "closure_voicing_expected"
    assert body["hint_id"] == "m_voicing"
    assert body["indicators"] == {"bibir": "hijau", "suara": "merah"}
    assert body["scorer"] == "rules"
    assert body["engine_version"] == "0.1.0"
    assert isinstance(body["processing_ms"], int)


def test_analyze_default_variant_is_hijau(client: TestClient, sample_video: bytes) -> None:
    assert _analyze(client, sample_video).json()["overall"] == "hijau"


def test_analyze_retry(client: TestClient, sample_video: bytes) -> None:
    res = _analyze(client, sample_video, "l2_pa", mock="retry")
    assert res.status_code == 200
    body = AnalyzeResponse.model_validate(res.json())
    assert body.status == "retry"
    assert body.quality_flags
    assert body.overall is None and body.score is None and body.units is None
    assert body.hint_id.startswith("retry_") and body.hint_id in CONTENT.hints
    assert res.json()["visuals"] == {
        "vowel_point": None,
        "vowel_anchors": None,
        "lip_contour": None,
        "loudness": None,
    }


def test_analyze_invalid_mock_variant(client: TestClient, sample_video: bytes) -> None:
    res = _analyze(client, sample_video, mock="biru")
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "invalid_request"


def test_analyze_unknown_item(client: TestClient, sample_video: bytes) -> None:
    res = _analyze(client, sample_video, "l3_nana")
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "invalid_item_id"


def test_analyze_missing_fields(client: TestClient, sample_video: bytes) -> None:
    res = client.post("/v1/analyze", data={"user_id": "u1"}, files=video_file(sample_video))
    assert res.status_code == 422
    message = res.json()["detail"]["message"]
    assert "item_id" in message and "session_id" in message


@pytest.mark.parametrize("bad_user_id", ["../etc", "a b", "x" * 65, ""])
def test_analyze_rejects_unsafe_user_id(
    client: TestClient, sample_video: bytes, bad_user_id: str
) -> None:
    res = client.post(
        "/v1/analyze",
        data={"user_id": bad_user_id, "item_id": "l1_a", "session_id": "s1"},
        files=video_file(sample_video),
    )
    assert res.status_code == 422


def test_analyze_rejects_non_video_content_type(client: TestClient, sample_video: bytes) -> None:
    res = client.post(
        "/v1/analyze",
        data={"user_id": "u1", "item_id": "l1_a", "session_id": "s1"},
        files=video_file(sample_video, name="x.txt", content_type="text/plain"),
    )
    assert res.status_code == 415
    assert res.json()["detail"]["code"] == "unsupported_media_type"


def test_analyze_rejects_fake_video(client: TestClient) -> None:
    res = client.post(
        "/v1/analyze",
        data={"user_id": "u1", "item_id": "l1_a", "session_id": "s1"},
        files=video_file(b"this is not an mp4 file at all"),
    )
    assert res.status_code == 415


def test_analyze_rejects_empty_file(client: TestClient) -> None:
    res = client.post(
        "/v1/analyze",
        data={"user_id": "u1", "item_id": "l1_a", "session_id": "s1"},
        files=video_file(b""),
    )
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "empty_file"


def _fake_mp4(size: int) -> bytes:
    header = b"\x00\x00\x00\x18ftypisom"
    return header + b"\x00" * (size - len(header))


def test_upload_just_over_limit_is_rejected(client: TestClient) -> None:
    res = client.post(
        "/v1/analyze",
        data={"user_id": "u1", "item_id": "l1_a", "session_id": "s1"},
        files=video_file(_fake_mp4(15 * 1024 * 1024 + 1)),
    )
    assert res.status_code == 413
    assert res.json()["detail"]["code"] == "file_too_large"


def test_upload_far_over_limit_is_rejected_early(client: TestClient) -> None:
    res = client.post(
        "/v1/analyze",
        data={"user_id": "u1", "item_id": "l1_a", "session_id": "s1"},
        files=video_file(_fake_mp4(17 * 1024 * 1024)),
    )
    assert res.status_code == 413
    assert res.json()["detail"]["code"] == "file_too_large"


def test_upload_at_limit_is_accepted(client: TestClient) -> None:
    res = client.post(
        "/v1/analyze",
        data={"user_id": "u1", "item_id": "l1_a", "session_id": "s1"},
        files=video_file(_fake_mp4(15 * 1024 * 1024)),
    )
    assert res.status_code == 200


def test_analyze_without_mock_mode_is_unavailable(make_client, sample_video: bytes) -> None:
    res = _analyze(make_client(mock_mode=False), sample_video)
    assert res.status_code == 503
    assert res.json()["detail"]["code"] == "analysis_unavailable"


def test_analyze_writes_nothing_to_data_dir(
    client: TestClient, sample_video: bytes, data_dir
) -> None:
    _analyze(client, sample_video)
    assert not data_dir.exists() or not any(data_dir.rglob("*"))


# ---------- calibrate ----------


def _calibrate(client: TestClient, video: bytes, step: str, **params: str):
    return client.post(
        "/v1/calibrate",
        params=params,
        data={"user_id": "user-123", "step": step},
        files=video_file(video),
    )


@pytest.mark.parametrize("step", ["rest", "vowel_a", "vowel_i", "vowel_u"])
def test_calibrate_mock_ok(client: TestClient, sample_video: bytes, step: str) -> None:
    res = _calibrate(client, sample_video, step)
    assert res.status_code == 200
    body = CalibrateResponse.model_validate(res.json())
    assert body.status == "ok" and body.step == step and body.saved is True
    assert body.quality_flags == []
    assert body.calibration_complete is (step == "vowel_u")


def test_calibrate_mock_retry(client: TestClient, sample_video: bytes) -> None:
    body = _calibrate(client, sample_video, "vowel_a", mock="retry").json()
    assert body["status"] == "retry"
    assert body["saved"] is False
    assert body["quality_flags"]


def test_calibrate_invalid_step(client: TestClient, sample_video: bytes) -> None:
    assert _calibrate(client, sample_video, "vowel_x").status_code == 422


def test_calibrate_without_mock_mode_is_unavailable(make_client, sample_video: bytes) -> None:
    assert _calibrate(make_client(mock_mode=False), sample_video, "rest").status_code == 503
