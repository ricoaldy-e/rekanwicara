"""API contracts against mocked Auth/DB/Storage; synthetic media only."""

import json
from collections.abc import Callable
from unittest.mock import Mock
from urllib.parse import unquote

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.errors import ApiError
from app.api.mock import build_analyze_mock
from app.api.schemas import CombinedVisual, Item, Wav2Vec2Response
from app.api.v2 import analysis as analysis_v2
from app.api.v2 import store
from app.api.v2.catalog import GUIDE_ITEMS
from app.api.v2.vowels import VOWEL_IDS

UID = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
WORD = "33333333-3333-4333-8333-333333333333"
FOREIGN_WORD = "44444444-4444-4444-8444-444444444444"
SYLLABLE = "55555555-5555-4555-8555-555555555555"
HEADERS = {"Authorization": "Bearer fixture-user-token"}
PUBLIC_KEY = "fixture-public-key"
PRIVATE_KEY = "fixture-service-role-not-used-by-v2"
CUSTOM_PATH = f"{UID}/words/{WORD}/video.mp4"
IMPORTANT_WORDS = {
    "tolong": ["to", "long"],
    "polisi": ["po", "li", "si"],
    "api": ["a", "pi"],
    "sakit": ["sa", "kit"],
    "obat": ["o", "bat"],
    "alamat": ["a", "la", "mat"],
    "makan": ["ma", "kan"],
    "haus": [],
}


@pytest.fixture
def v2_client(make_client: Callable[..., TestClient]) -> TestClient:
    return make_client(
        supabase_url="https://project.example.test",
        supabase_anon_key=PUBLIC_KEY,
        supabase_service_role_key=PRIVATE_KEY,
    )


@pytest.fixture
def upstream(monkeypatch: pytest.MonkeyPatch) -> dict:
    state = {
        "auth_status": 200,
        "anonymous": False,
        "default_present": True,
        "storage_status": 200,
        "missing_bucket": False,
        "requests": [],
        "objects": {
            CUSTOM_PATH,
            *(item.storage_path for item in GUIDE_ITEMS.values()),
            *(f"default/level-1/{vowel}.mp4" for vowel in "aiueo"),
        },
        "custom_words": [
            {
                "id": WORD,
                "user_id": UID,
                "word": "KERTAS",
                "instruction": "Ucapkan KERTAS perlahan.",
            },
            {
                "id": FOREIGN_WORD,
                "user_id": OTHER,
                "word": "RAHASIA",
                "instruction": "Ucapkan kata.",
            },
        ],
        "custom_syllables": [],
        "custom_videos": [
            {
                "id": "fixture-video",
                "word_id": WORD,
                "syllable_id": None,
                "storage_path": CUSTOM_PATH,
                "sort_order": 1,
            }
        ],
        "llm_status": 200,
        "llm_content": json.dumps(
            {"instruction": "Rapatkan bibir, lalu buka perlahan sesuai target."}
        ),
        "llm_finish": "stop",
        "llm_timeout": False,
    }

    def handle(request: httpx.Request) -> httpx.Response:
        state["requests"].append(request)
        if request.url.host == "llm.example.test":
            assert "apikey" not in request.headers
            assert request.headers["authorization"] == "Bearer fixture-llm-key"
            if state["llm_timeout"]:
                raise httpx.ReadTimeout("synthetic-timeout", request=request)
            return httpx.Response(
                state["llm_status"],
                json={
                    "choices": [
                        {
                            "finish_reason": state["llm_finish"],
                            "message": {"content": state["llm_content"]},
                        }
                    ]
                },
            )
        assert request.headers["apikey"] == PUBLIC_KEY
        assert request.headers["authorization"] == HEADERS["Authorization"]
        if request.url.path == "/auth/v1/user":
            return httpx.Response(
                state["auth_status"],
                json={
                    "id": UID,
                    "email": "fixture@example.test",
                    "is_anonymous": state["anonymous"],
                },
            )
        if request.url.path.startswith("/storage/v1/object/info/"):
            if state["missing_bucket"] and "/default-videos/" in request.url.path:
                return httpx.Response(400, json={"statusCode": "404", "code": "NoSuchBucket"})
            if state["storage_status"] != 200:
                return httpx.Response(state["storage_status"], json={})
            path = unquote(request.url.path).split("/object/info/", 1)[1]
            bucket, path = path.split("/", 1)
            exists = (
                state["default_present"] if bucket == "default-videos" else path in state["objects"]
            )
            if path.startswith("default/level-1/"):
                exists = exists and state["default_present"]
            return (
                httpx.Response(200, json={"size": 123, "content_type": "video/mp4"})
                if exists
                else httpx.Response(404, json={})
            )
        if request.url.path.startswith("/rest/v1/"):
            table = request.url.path.rsplit("/", 1)[1]
            rows = [dict(row) for row in state[table]]
            for key, value in request.url.params.items():
                if value.startswith("eq.") and "." not in key:
                    rows = [row for row in rows if str(row.get(key)) == value[3:]]
            # Simulate RLS as well as the explicit owner predicates.
            if table == "custom_words":
                rows = [row for row in rows if row["user_id"] == UID]
            if table == "custom_syllables":
                own_words = {row["id"] for row in state["custom_words"] if row["user_id"] == UID}
                rows = [row for row in rows if row["word_id"] in own_words]
                if "!inner" in request.url.params.get("select", ""):
                    rows = [{**row, "custom_words": {"user_id": UID}} for row in rows]
            offset = int(request.url.params.get("offset", "0"))
            return httpx.Response(
                200, json=rows[offset : offset + int(request.url.params.get("limit", "200"))]
            )
        raise AssertionError("Unexpected external request")

    original = httpx.Client
    monkeypatch.setattr(
        store.httpx,
        "Client",
        lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs),
    )
    return state


def test_catalog_default_and_only_complete_owned_custom(
    v2_client: TestClient, upstream: dict
) -> None:
    response = v2_client.get("/v2/catalog", headers=HEADERS)
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {"level_1", "words"}
    assert {item["id"] for item in body["level_1"]} >= {"l1_a", "l1_i", "l1_u"}
    assert len(body["level_1"]) == 8
    assert VOWEL_IDS <= {item["id"] for item in body["level_1"]}
    defaults = [word for word in body["words"] if word["source"] == "default"]
    assert [word["id"] for word in defaults] == [f"kp_{word}" for word in IMPORTANT_WORDS]
    assert all(word["automatic_evaluation"] is False for word in defaults)
    assert [word["has_level_2"] for word in defaults] == [True] * 7 + [False]
    assert not any(word["id"].startswith("l3_") for word in body["words"])
    assert [word["id"] for word in body["words"] if word["source"] == "custom"] == [
        f"custom_word:{WORD}"
    ]
    assert "RAHASIA" not in response.text and PRIVATE_KEY not in response.text
    assert all(
        "/object/info/" in r.url.path or r.url.path.startswith(("/auth/", "/rest/"))
        for r in upstream["requests"]
    )
    assert all(
        "/default/words/" not in r.url.path and "/default/syllables/" not in r.url.path
        for r in upstream["requests"]
    )


@pytest.mark.parametrize(
    "path", ["/v2/catalog", "/v2/words/kp_tolong", "/v2/words/l3_papa", "/v2/items/l1_a"]
)
def test_missing_jwt_rejected_before_upstream(
    v2_client: TestClient, upstream: dict, path: str
) -> None:
    result = v2_client.get(path)
    assert result.status_code == 401 and result.json()["detail"]["code"] == "UNAUTHENTICATED"
    assert upstream["requests"] == []


@pytest.mark.parametrize(
    "kind,status", [("expired", 401), ("anonymous", 403), ("unavailable", 503)]
)
def test_auth_verification_failures(
    v2_client: TestClient, upstream: dict, kind: str, status: int
) -> None:
    if kind == "expired":
        upstream["auth_status"] = 401
    if kind == "unavailable":
        upstream["auth_status"] = 503
    if kind == "anonymous":
        upstream["anonymous"] = True
    assert v2_client.get("/v2/catalog", headers=HEADERS).status_code == status
    assert len(upstream["requests"]) == 1


def test_default_repeated_syllable_positions_and_binding(
    v2_client: TestClient, upstream: dict
) -> None:
    result = v2_client.get("/v2/words/l3_papa", headers=HEADERS)
    assert result.status_code == 200
    body = result.json()
    assert [part["id"] for part in body["level_2"]] == ["l2_pa", "l2_pa"]
    assert [part["position"] for part in body["level_2"]] == [1, 2]
    assert [part["videos"][0]["path"] for part in body["level_2"]] == ["level-2/pa.mp4"] * 2
    assert body["level_3"]["videos"][0]["path"] == "level-3/papa.mp4"


@pytest.mark.parametrize("word,syllables", IMPORTANT_WORDS.items())
def test_important_word_instructions_sequence_and_exact_video_bindings(
    v2_client: TestClient, upstream: dict, word: str, syllables: list[str]
) -> None:
    response = v2_client.get(f"/v2/words/kp_{word}", headers=HEADERS)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == f"kp_{word}" and body["source"] == "default"
    assert body["text"] == word.upper() and body["automatic_evaluation"] is False
    assert body["syllable_split"] == "-".join(syllables or [word])
    assert [part["text"] for part in body["level_2"]] == [s.upper() for s in syllables]
    assert [part["position"] for part in body["level_2"]] == list(range(1, len(syllables) + 1))
    materials = [(body["id"], body["level_3"], f"default/words/{word}.mp4")]
    for position, (part, syllable) in enumerate(zip(body["level_2"], syllables, strict=True), 1):
        assert part["id"] == f"kp_{word}_{syllable}"
        materials.append(
            (part["id"], part, f"default/syllables/{word}/{position:02}-{syllable}.mp4")
        )
    for item_id, material, path in materials:
        assert material["instruction"] == "\n".join(GUIDE_ITEMS[item_id].steps)
        assert material["videos"] == [
            {"bucket": "rekan-wicara-tutorials", "path": path, "position": 1, "available": True}
        ]
    storage = [r for r in upstream["requests"] if "/object/info/" in r.url.path]
    assert len(storage) == 1 + len(syllables)
    assert all(r.method == "GET" for r in upstream["requests"])


def test_missing_guide_video_keeps_exact_reference_without_substitution(
    v2_client: TestClient, upstream: dict
) -> None:
    path = "default/syllables/tolong/02-long.mp4"
    upstream["objects"].remove(path)
    response = v2_client.get("/v2/words/kp_tolong", headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["level_2"][0]["videos"][0]["available"] is True
    assert body["level_2"][1]["videos"] == [
        {"bucket": "rekan-wicara-tutorials", "path": path, "position": 1, "available": False}
    ]
    assert body["level_3"]["videos"][0]["available"] is True


def test_guide_storage_denied_is_an_explicit_service_error(
    v2_client: TestClient, upstream: dict
) -> None:
    upstream["storage_status"] = 403
    response = v2_client.get("/v2/words/kp_haus", headers=HEADERS)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "STORAGE_UNAVAILABLE"


@pytest.mark.parametrize("item_id", GUIDE_ITEMS)
def test_each_guide_item_is_readable_but_never_sent_to_evaluation(
    v2_client: TestClient,
    upstream: dict,
    sample_video: bytes,
    monkeypatch: pytest.MonkeyPatch,
    item_id: str,
) -> None:
    extract = Mock(side_effect=AssertionError("Guides must not be evaluated"))
    recognize = Mock(side_effect=AssertionError("Guides must not run ASR"))
    monkeypatch.setattr(analysis_v2, "extract_or_error", extract)
    monkeypatch.setattr(analysis_v2, "_recognize", recognize)
    detail = v2_client.get(f"/v2/items/{item_id}", headers=HEADERS)
    assert detail.status_code == 200
    assert detail.json()["automatic_evaluation"] is False
    assert detail.json()["videos"][0]["path"] == GUIDE_ITEMS[item_id].storage_path
    response = send_analysis(v2_client, sample_video, item_id)
    assert response.status_code == 404 and response.json()["detail"]["code"] == "ITEM_NOT_FOUND"
    assert not extract.called and not recognize.called


def test_foreign_custom_word_is_not_found(v2_client: TestClient, upstream: dict) -> None:
    response = v2_client.get(f"/v2/words/custom_word:{FOREIGN_WORD}", headers=HEADERS)
    assert response.status_code == 404 and "RAHASIA" not in response.text
    query = next(r for r in upstream["requests"] if "/rest/" in r.url.path)
    assert query.url.params["user_id"] == f"eq.{UID}"


def test_custom_without_syllables_direct_level_three(v2_client: TestClient, upstream: dict) -> None:
    result = v2_client.get(f"/v2/words/custom_word:{WORD}", headers=HEADERS)
    assert result.status_code == 200
    body = result.json()
    assert body["level_2"] == []
    assert body["level_3"]["videos"] == [
        {"bucket": "rekan-wicara-tutorials", "path": CUSTOM_PATH, "position": 1, "available": True}
    ]
    assert body["automatic_evaluation"] is True


def test_custom_syllables_ordered_and_bound_by_id(v2_client: TestClient, upstream: dict) -> None:
    second = "66666666-6666-4666-8666-666666666666"
    upstream["custom_syllables"] = [
        {
            "id": second,
            "word_id": WORD,
            "syllable": "TAS",
            "instruction": "Ucapkan TAS.",
            "position": 2,
        },
        {
            "id": SYLLABLE,
            "word_id": WORD,
            "syllable": "KER",
            "instruction": "Ucapkan KER.",
            "position": 1,
        },
    ]
    for part in upstream["custom_syllables"]:
        path = f"{UID}/syllables/{part['id']}/video.mp4"
        upstream["objects"].add(path)
        upstream["custom_videos"].append(
            {
                "id": part["id"],
                "word_id": None,
                "syllable_id": part["id"],
                "storage_path": path,
                "sort_order": 1,
            }
        )
    result = v2_client.get(f"/v2/words/custom_word:{WORD}", headers=HEADERS)
    assert result.status_code == 200
    assert [part["text"] for part in result.json()["level_2"]] == ["KER", "TAS"]
    assert result.json()["level_2"][0]["videos"][0]["path"].endswith(f"/{SYLLABLE}/video.mp4")


@pytest.mark.parametrize(
    "kind",
    [
        "no_instruction",
        "no_video",
        "multiple_videos",
        "foreign_path",
        "default_path",
        "missing_object",
    ],
)
def test_draft_or_incomplete_custom_hidden(
    v2_client: TestClient, upstream: dict, kind: str
) -> None:
    if kind == "no_instruction":
        upstream["custom_words"][0]["instruction"] = ""
    if kind == "no_video":
        upstream["custom_videos"] = []
    if kind == "multiple_videos":
        upstream["custom_videos"] *= 2
    if kind == "foreign_path":
        upstream["custom_videos"][0]["storage_path"] = f"{OTHER}/words/video.mp4"
    if kind == "default_path":
        upstream["custom_videos"][0]["storage_path"] = "default/words/tolong.mp4"
    if kind == "missing_object":
        upstream["objects"].clear()
    result = v2_client.get("/v2/catalog", headers=HEADERS)
    assert result.status_code == 200
    assert not any(word["source"] == "custom" for word in result.json()["words"])


def test_default_missing_video_is_explicit_and_basic_fallback_empty(
    v2_client: TestClient, upstream: dict
) -> None:
    upstream["default_present"] = False
    result = v2_client.get("/v2/catalog", headers=HEADERS)
    assert result.status_code == 200 and all(
        item["videos"] == [] for item in result.json()["level_1"]
    )
    result = v2_client.get("/v2/words/l3_papa", headers=HEADERS)
    assert result.status_code == 404 and result.json()["detail"]["code"] == "VIDEO_NOT_FOUND"


def test_storage_denied_is_not_claimed_to_be_missing_or_complete(
    v2_client: TestClient, upstream: dict
) -> None:
    upstream["storage_status"] = 403
    assert v2_client.get("/v2/catalog", headers=HEADERS).status_code == 503


def test_offline_important_words_excluded_even_if_added_to_content(
    v2_client: TestClient, upstream: dict
) -> None:
    item = Item(
        item_id="l3_tolong",
        level=3,
        text="tolong",
        units=["to", "long"],
        priority="required",
        emoji=None,
        active=True,
    )
    v2_client.app.state.content.items.append(item)
    v2_client.app.state.content.items_by_id[item.item_id] = item
    result = v2_client.get("/v2/catalog", headers=HEADERS)
    assert result.status_code == 200 and not any(
        word["id"] == item.item_id for word in result.json()["words"]
    )
    assert v2_client.get("/v2/words/l3_tolong", headers=HEADERS).status_code == 404


def send_analysis(
    client: TestClient, video: bytes, item_id: str = "l3_papa", **fields: str
) -> httpx.Response:
    return client.post(
        "/v2/analyze",
        headers=HEADERS,
        data={"item_id": item_id, "session_id": "fixture-session", **fields},
        files={"file": ("private-recording.mp4", video, "video/mp4")},
    )


@pytest.mark.parametrize(
    "variant,expected",
    [("hijau", "sesuai"), ("kuning", "mendekati"), ("merah", "belum_sesuai"), ("retry", None)],
)
def test_level_one_adapter_uses_real_pipeline_boundary(
    v2_client: TestClient,
    upstream: dict,
    sample_video: bytes,
    monkeypatch: pytest.MonkeyPatch,
    variant: str,
    expected: str | None,
) -> None:
    extract = Mock(return_value=object())
    monkeypatch.setattr(analysis_v2, "extract_or_error", extract)

    def score(item, *args):
        return build_analyze_mock(
            item, variant, scorer="rules", engine_version="fixture", processing_ms=1
        ), None

    monkeypatch.setattr(analysis_v2, "_analysis", score)
    recognition = Mock(side_effect=AssertionError("Level 1 must not call ASR"))
    monkeypatch.setattr(analysis_v2, "_recognize", recognition)
    result = send_analysis(v2_client, sample_video, "l1_m", user_id=OTHER)
    assert result.status_code == 200, result.text
    body = result.json()
    assert (
        body["level"] == 1
        and body["engine"] == "mediapipe_parselmouth"
        and body["result"] == expected
    )
    assert extract.call_count == 1 and not recognition.called
    if expected is None:
        assert (
            body["status"] == "retry"
            and body["lip_result"] is None
            and body["voice_result"] is None
        )
    else:
        assert body["status"] == "evaluated" and body["voice_result"] in (
            "sesuai",
            "mendekati",
            "belum_sesuai",
        )
        assert isinstance(body["visuals"], dict)


@pytest.fixture
def visible_face(monkeypatch: pytest.MonkeyPatch) -> Mock:
    observe = Mock(
        return_value=CombinedVisual(
            n_frames=30,
            face_frames=30,
            warnings=[],
            gate="passed",
            motion_steps=4,
            lip_contour=None,
        )
    )
    monkeypatch.setattr(analysis_v2, "observe_visual", observe)
    return observe


@pytest.mark.parametrize(
    "item_id,transcription,expected,level",
    [
        ("l2_pa", "pa", "sesuai", 2),
        ("l3_papa", "PAPA!", "sesuai", 3),
        ("l3_papa", "papi", "belum_sesuai", 3),
        ("l3_papa", "", None, 3),
        (f"custom_word:{WORD}", "kertas", "sesuai", 3),
    ],
)
def test_level_two_three_use_authoritative_target_and_binary_voice(
    v2_client: TestClient,
    upstream: dict,
    sample_video: bytes,
    monkeypatch: pytest.MonkeyPatch,
    visible_face: Mock,
    tmp_path,
    item_id: str,
    transcription: str,
    expected: str | None,
    level: int,
) -> None:
    v2_client.app.state.settings.tmp_dir = tmp_path
    monkeypatch.setattr(
        analysis_v2, "extract_or_error", Mock(side_effect=AssertionError("No Parselmouth in L2/3"))
    )
    recognize = Mock(
        return_value=Wav2Vec2Response(
            status="success",
            model="Wikidepia/wav2vec2-xls-r-300m-indonesian",
            transcription=transcription,
            inference_ms=1,
        )
    )
    monkeypatch.setattr(analysis_v2, "_recognize", recognize)
    result = send_analysis(v2_client, sample_video, item_id, target="untrusted", user_id=OTHER)
    assert result.status_code == 200, result.text
    body = result.json()
    assert body["level"] == level and body["engine"] == "mediapipe_wav2vec2"
    assert body["result"] == expected and body["voice_result"] == expected
    assert body["visuals"] is None and body["lip_result"] is None
    assert "transcription" not in body and "lip_contour" not in result.text
    assert recognize.called and visible_face.called and list(tmp_path.iterdir()) == []


def test_visual_quality_retry_does_not_run_asr(
    v2_client: TestClient,
    upstream: dict,
    sample_video: bytes,
    monkeypatch: pytest.MonkeyPatch,
    visible_face: Mock,
) -> None:
    visible_face.return_value = CombinedVisual(
        n_frames=30,
        face_frames=0,
        warnings=["no_face"],
        gate="retry",
        motion_steps=0,
        lip_contour=None,
    )
    recognize = Mock(side_effect=AssertionError("Bad quality must not be scored"))
    monkeypatch.setattr(analysis_v2, "_recognize", recognize)
    result = send_analysis(v2_client, sample_video)
    assert result.status_code == 200 and result.json()["status"] == "retry"
    assert result.json()["result"] is None and not recognize.called


@pytest.mark.parametrize("status,code", [(503, "wav2vec2_unavailable"), (504, "wav2vec2_timeout")])
def test_model_failure_never_becomes_incorrect_pronunciation(
    v2_client: TestClient,
    upstream: dict,
    sample_video: bytes,
    visible_face: Mock,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
    status: int,
    code: str,
) -> None:
    v2_client.app.state.settings.tmp_dir = tmp_path
    monkeypatch.setattr(
        analysis_v2,
        "_recognize",
        Mock(side_effect=ApiError(status, code, "private-internal-error")),
    )
    result = send_analysis(v2_client, sample_video)
    assert result.status_code == status
    assert "result" not in result.json() and "private-internal-error" not in result.text
    assert list(tmp_path.iterdir()) == []


def test_real_l1_quality_pipeline_without_face_returns_retry(
    v2_client: TestClient, upstream: dict, sample_video: bytes, face_model
) -> None:
    v2_client.app.state.settings.face_model_path = face_model
    result = send_analysis(v2_client, sample_video, "l1_a")
    assert result.status_code == 200, result.text
    assert result.json()["status"] == "retry" and result.json()["result"] is None


def test_invalid_upload_and_unsupported_item(
    v2_client: TestClient, upstream: dict, sample_video: bytes
) -> None:
    assert send_analysis(v2_client, b"not-a-video", "l1_a").status_code == 415
    assert send_analysis(v2_client, sample_video, "kp_tolong").status_code == 404
    assert send_analysis(v2_client, sample_video, "l1_unknown").status_code == 404
    assert (
        v2_client.post(
            "/v2/analyze",
            files={"file": ("clip.mp4", sample_video, "video/mp4")},
            data={"item_id": "l1_a", "session_id": "fixture"},
        ).status_code
        == 401
    )


def setup_llm(client: TestClient) -> None:
    settings = client.app.state.settings
    settings.llm_api_url = "https://llm.example.test/v1/chat/completions"
    settings.llm_api_key = SecretStr("fixture-llm-key")
    settings.llm_model = "fixture-model"


def test_generate_editable_instruction_without_database_mutations(
    v2_client: TestClient, upstream: dict
) -> None:
    setup_llm(v2_client)
    result = v2_client.post(
        "/v2/instructions/generate",
        headers=HEADERS,
        json={"type": "syllable", "text": " KER ", "parent_word": "KERTAS"},
    )
    assert result.status_code == 200 and set(result.json()) == {"instruction"}
    assert result.json()["instruction"] == json.loads(upstream["llm_content"])["instruction"]
    assert all(
        request.url.path == "/auth/v1/user" or request.url.host == "llm.example.test"
        for request in upstream["requests"]
    )
    payload = json.loads(upstream["requests"][-1].content)
    assert json.loads(payload["messages"][1]["content"])["parent_word"] == "KERTAS"
    assert "fixture-llm-key" not in result.text and UID not in json.dumps(payload)


@pytest.mark.parametrize(
    "kind,status,code",
    [
        ("not_configured", 503, "AI_UNAVAILABLE"),
        ("timeout", 504, "INFERENCE_TIMEOUT"),
        ("rate_limit", 429, "GENERATION_RATE_LIMITED"),
        ("provider_error", 503, "AI_UNAVAILABLE"),
        ("malformed", 503, "AI_UNAVAILABLE"),
        ("unsafe", 503, "AI_UNAVAILABLE"),
        ("truncated", 503, "AI_UNAVAILABLE"),
    ],
)
def test_llm_failures_preserve_manual_work(
    v2_client: TestClient, upstream: dict, kind: str, status: int, code: str
) -> None:
    if kind != "not_configured":
        setup_llm(v2_client)
    if kind == "timeout":
        upstream["llm_timeout"] = True
    if kind == "rate_limit":
        upstream["llm_status"] = 429
    if kind == "provider_error":
        upstream["llm_status"] = 500
    if kind == "malformed":
        upstream["llm_content"] = "not-json"
    if kind == "unsafe":
        upstream["llm_content"] = json.dumps({"instruction": "Dengarkan suara agar normal."})
    if kind == "truncated":
        upstream["llm_finish"] = "length"
    result = v2_client.post(
        "/v2/instructions/generate", headers=HEADERS, json={"type": "word", "text": "KERTAS"}
    )
    assert result.status_code == status and result.json()["detail"]["code"] == code
    assert all(
        request.method == "GET" or request.url.host == "llm.example.test"
        for request in upstream["requests"]
    )


def test_generator_auth_and_invalid_input(v2_client: TestClient, upstream: dict) -> None:
    assert (
        v2_client.post(
            "/v2/instructions/generate", json={"type": "word", "text": "KERTAS"}
        ).status_code
        == 401
    )
    result = v2_client.post(
        "/v2/instructions/generate", headers=HEADERS, json={"type": "word", "text": " "}
    )
    assert result.status_code == 422 and result.json()["detail"]["code"] == "INVALID_INPUT"


def test_all_v2_routes_registered_and_v1_unchanged(v2_client: TestClient, upstream: dict) -> None:
    paths = v2_client.get("/openapi.json").json()["paths"]
    assert {
        "/v2/catalog",
        "/v2/words/{word_id}",
        "/v2/items/{item_id}",
        "/v2/analyze",
        "/v2/instructions/generate",
    }.issubset(paths)
    assert {"/v1/analyze", "/v1/calibrate", "/v1/items", "/v1/model-video/{item_id}"}.issubset(
        paths
    )
    assert v2_client.get("/v1/health").status_code == 200
    assert v2_client.get("/v1/items").status_code == 200


def test_actual_storage_missing_bucket_error_allows_basic_fallback(
    v2_client: TestClient, upstream: dict
) -> None:
    upstream["missing_bucket"] = True
    result = v2_client.get("/v2/catalog", headers=HEADERS)
    assert result.status_code == 200
    assert all(
        item["videos"] == [] for item in result.json()["level_1"] if item["id"] not in VOWEL_IDS
    )
    assert all(item["videos"] for item in result.json()["level_1"] if item["id"] in VOWEL_IDS)


def test_word_with_unmapped_level_two_vowel_is_not_given_a_level_one_item(
    v2_client: TestClient, upstream: dict
) -> None:
    result = v2_client.get("/v2/words/l3_apa", headers=HEADERS)
    assert result.status_code == 422 and result.json()["detail"]["code"] == "INVALID_MATERIAL"


def test_oversized_v2_upload_preserves_v1_limit_with_v2_error_code(
    v2_client: TestClient, upstream: dict
) -> None:
    result = v2_client.post("/v2/analyze", headers={"Content-Length": str(16 * 1024 * 1024 + 1)})
    assert result.status_code == 413 and result.json()["detail"]["code"] == "FILE_TOO_LARGE"


def test_private_video_binding_rejects_two_parents(v2_client: TestClient, upstream: dict) -> None:
    upstream["custom_videos"][0]["syllable_id"] = SYLLABLE
    result = v2_client.get("/v2/catalog", headers=HEADERS)
    assert result.status_code == 200 and all(
        word["source"] == "default" for word in result.json()["words"]
    )


def test_legacy_l0_instruction_uses_the_sound_instead_of_the_exercise_title(
    v2_client: TestClient, upstream: dict
) -> None:
    result = v2_client.get("/v2/catalog", headers=HEADERS)
    items = {item["id"]: item for item in result.json()["level_1"]}
    assert items["l0_hold_a"]["instruction"] == "Ucapkan A dan tahan selama rekaman."
    assert items["l0_soft_loud"]["instruction"] == "Ucapkan A pelan, lalu lebih kuat."
