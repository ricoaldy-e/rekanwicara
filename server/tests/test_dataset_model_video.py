import csv
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.schemas import DatasetUploadResponse
from app.core.storage import METADATA_COLUMNS
from tests.conftest import video_file


@pytest.fixture
def ds_client(make_client) -> TestClient:
    return make_client(dataset_mode=True)


def _fields(**overrides: str) -> dict[str, str]:
    fields = {
        "purpose": "dataset",
        "speaker_id": "P1",
        "item_id": "l3_mama",
        "rep": "1",
        "intended_error": "none",
        "condition": "quiet",
        "session_id": "sess-1",
    }
    fields.update(overrides)
    return fields


def _upload(client: TestClient, video: bytes, **overrides: str):
    return client.post("/v1/dataset/upload", data=_fields(**overrides), files=video_file(video))


def _metadata(data_dir: Path) -> list[dict[str, str]]:
    with (data_dir / "raw" / "metadata.csv").open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        assert tuple(reader.fieldnames or ()) == METADATA_COLUMNS
        return list(reader)


def test_metadata_columns_match_spec() -> None:
    # SPEC §10.5
    assert METADATA_COLUMNS == (
        "clip_id",
        "speaker_id",
        "item_id",
        "rep",
        "intended_error",
        "condition",
        "session_id",
        "recorded_at",
        "device",
    )


def test_dataset_upload_disabled_by_default(client: TestClient, sample_video: bytes) -> None:
    res = _upload(client, sample_video)
    assert res.status_code == 404


def test_dataset_upload_saves_clip_and_metadata(
    ds_client: TestClient, sample_video: bytes, data_dir: Path
) -> None:
    res = _upload(ds_client, sample_video, device="Samsung A52")
    assert res.status_code == 200, res.text
    clip_id = DatasetUploadResponse.model_validate(res.json()).clip_id
    assert clip_id == "P1__l3_mama__r1__none__quiet"

    path = data_dir / "raw" / "P1" / "l3_mama__r1__none__quiet.mp4"
    # SPEC §5: raw/{speaker_id}/{item_id}__r{rep}__{intended_error}__{condition}.mp4
    assert path.read_bytes() == sample_video

    rows = _metadata(data_dir)
    assert len(rows) == 1
    row = rows[0]
    assert row["clip_id"] == clip_id
    assert (row["speaker_id"], row["item_id"], row["rep"]) == ("P1", "l3_mama", "1")
    assert (row["intended_error"], row["condition"], row["session_id"]) == (
        "none",
        "quiet",
        "sess-1",
    )
    assert row["device"] == "Samsung A52"
    assert row["recorded_at"]
    assert not list((data_dir / "raw" / "P1").glob("*.part"))


def test_dataset_device_may_be_omitted(
    ds_client: TestClient, sample_video: bytes, data_dir: Path
) -> None:
    assert _upload(ds_client, sample_video).status_code == 200
    assert _metadata(data_dir)[0]["device"] == ""


def test_dataset_ignores_removed_fields(
    ds_client: TestClient, sample_video: bytes, data_dir: Path
) -> None:
    # sex/age_group were dropped from SPEC §10.5; an old app build sending them must not break.
    assert _upload(ds_client, sample_video, sex="P", age_group="18-25").status_code == 200
    row = _metadata(data_dir)[0]
    assert "sex" not in row and "age_group" not in row


def test_dataset_reupload_replaces_row(
    ds_client: TestClient, sample_video: bytes, data_dir: Path
) -> None:
    _upload(ds_client, sample_video, session_id="first")
    _upload(ds_client, sample_video, rep="2")
    _upload(ds_client, sample_video, session_id="again")  # "ulang" of rep 1
    rows = _metadata(data_dir)
    assert [r["rep"] for r in rows] == ["2", "1"]
    assert rows[1]["session_id"] == "again"


@pytest.mark.parametrize("speaker_id", ["P1", "P2", "P3"])
def test_dataset_accepts_team_speakers(
    ds_client: TestClient, sample_video: bytes, data_dir: Path, speaker_id: str
) -> None:
    res = _upload(ds_client, sample_video, speaker_id=speaker_id)
    assert res.status_code == 200
    assert (data_dir / "raw" / speaker_id / "l3_mama__r1__none__quiet.mp4").is_file()


def test_dataset_accepts_inactive_bonus_item(ds_client: TestClient, sample_video: bytes) -> None:
    assert _upload(ds_client, sample_video, item_id="l1_e").status_code == 200


@pytest.mark.parametrize(
    ("overrides", "code"),
    [
        ({"speaker_id": "P4"}, "invalid_speaker_id"),
        ({"speaker_id": "p1"}, "invalid_speaker_id"),
        ({"speaker_id": "S01"}, "invalid_speaker_id"),
        ({"speaker_id": "T00"}, "invalid_speaker_id"),
        ({"speaker_id": "../P1"}, "invalid_speaker_id"),
        ({"item_id": "l3_nana"}, "invalid_item_id"),
        ({"item_id": "other_na"}, "invalid_item_id"),
        ({"item_id": "../../etc"}, "invalid_item_id"),
        ({"intended_error": "lupa"}, "invalid_intended_error"),
        ({"intended_error": "u_flat_lips", "item_id": "l1_a"}, "intended_error_item_mismatch"),
        ({"intended_error": "bad_noise", "item_id": "l3_mama"}, "intended_error_item_mismatch"),
        ({"condition": "loud"}, "invalid_request"),
        ({"purpose": "other"}, "invalid_request"),
        ({"rep": "0"}, "invalid_request"),
        ({"rep": "abc"}, "invalid_request"),
        ({"session_id": "a/b"}, "invalid_request"),
        ({"device": "=HYPERLINK(1)"}, "invalid_request"),
    ],
)
def test_dataset_rejects_invalid_fields(
    ds_client: TestClient, sample_video: bytes, data_dir: Path, overrides: dict, code: str
) -> None:
    res = _upload(ds_client, sample_video, **overrides)
    assert res.status_code == 422, res.text
    assert res.json()["detail"]["code"] == code
    assert not (data_dir / "raw" / "metadata.csv").exists()


@pytest.mark.parametrize(
    ("intended_error", "item_id"),
    [
        ("mama_as_papa", "l3_mama"),
        ("u_flat_lips", "l1_u"),
        ("a_narrow", "l1_a"),
        ("mama_no_closure", "l3_mama"),
        ("bad_face", "l1_a"),
        ("bad_face", "l3_bumi"),
        ("bad_noise", "l1_a"),
    ],
)
def test_dataset_intended_errors(
    ds_client: TestClient,
    sample_video: bytes,
    data_dir: Path,
    intended_error: str,
    item_id: str,
) -> None:
    res = _upload(
        ds_client, sample_video, intended_error=intended_error, item_id=item_id, condition="noisy"
    )
    assert res.status_code == 200, res.text
    assert res.json()["clip_id"] == f"P1__{item_id}__r1__{intended_error}__noisy"
    assert _metadata(data_dir)[0]["intended_error"] == intended_error


def test_dataset_rejects_non_video(ds_client: TestClient, data_dir: Path) -> None:
    res = ds_client.post(
        "/v1/dataset/upload",
        data=_fields(),
        files=video_file(b"hello", name="a.wav", content_type="audio/wav"),
    )
    assert res.status_code == 415
    assert not (data_dir / "raw").exists()


# ---------- model videos ----------


def test_model_video_upload_and_download(
    ds_client: TestClient, sample_video: bytes, data_dir: Path
) -> None:
    assert ds_client.get("/v1/model-video/l2_ba").status_code == 404

    res = _upload(ds_client, sample_video, purpose="model_video", item_id="l2_ba")
    assert res.status_code == 200
    assert res.json()["clip_id"] == "model_video__l2_ba"
    assert (data_dir / "model_videos" / "l2_ba.mp4").is_file()
    assert not (data_dir / "raw" / "metadata.csv").exists()  # not part of the dataset

    got = ds_client.get("/v1/model-video/l2_ba")
    assert got.status_code == 200
    assert got.headers["content-type"] == "video/mp4"
    assert got.content == sample_video


def test_model_video_upload_overwrites(
    ds_client: TestClient, sample_video: bytes, data_dir: Path
) -> None:
    other = sample_video[:-10] + b"\x00" * 10
    _upload(ds_client, sample_video, purpose="model_video", item_id="l1_a")
    _upload(ds_client, other, purpose="model_video", item_id="l1_a")
    assert (data_dir / "model_videos" / "l1_a.mp4").read_bytes() == other


def test_model_video_rejects_unknown_item(ds_client: TestClient, sample_video: bytes) -> None:
    res = _upload(ds_client, sample_video, purpose="model_video", item_id="other_na")
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "invalid_item_id"


def test_model_video_served_without_dataset_mode(
    client: TestClient, sample_video: bytes, data_dir: Path
) -> None:
    target = data_dir / "model_videos" / "l3_ibu.mp4"
    target.parent.mkdir(parents=True)
    target.write_bytes(sample_video)
    res = client.get("/v1/model-video/l3_ibu")
    assert res.status_code == 200
    assert res.content == sample_video


@pytest.mark.parametrize("item_id", ["l9_zzz", "..%2F..%2Fsecret", "other_na"])
def test_model_video_unknown_item_is_404(client: TestClient, item_id: str) -> None:
    res = client.get(f"/v1/model-video/{item_id}")
    assert res.status_code == 404
    assert res.json()["detail"]["code"] in {"model_video_not_found", "not_found"}
