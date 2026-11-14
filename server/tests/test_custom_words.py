"""Manual CRUD HTTP orchestration; DB transactions and Storage are mocked here."""

import copy
import json
from urllib.parse import unquote

import httpx
import pytest

from app.api.v2 import store

UID = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
WORD = "33333333-3333-4333-8333-333333333333"
KER = "44444444-4444-4444-8444-444444444444"
TAS = "55555555-5555-4555-8555-555555555555"
HEADERS = {"Authorization": "Bearer fixture-companion"}
BASE = "/v2/custom-words"


@pytest.fixture
def manual(make_client, monkeypatch):
    state = {
        "custom_words": [],
        "custom_syllables": [],
        "custom_videos": [],
        "objects": {payload()["video_path"], *(p["video_path"] for p in payload()["syllables"])},
        "calls": [],
        "rpc_error": None,
        "delete_status": 200,
        "delete_denied": False,
        "schema_missing": False,
        "auth_status": 200,
        "uid": UID,
    }

    def handle(request):
        state["calls"].append(request)
        assert request.headers["apikey"] == "public-fixture-key"
        assert request.headers["authorization"] == HEADERS["Authorization"]
        path = unquote(request.url.path)
        if path == "/auth/v1/user":
            return httpx.Response(
                state["auth_status"],
                json={"id": state["uid"], "email": "fixture@example.test", "is_anonymous": False},
            )
        if path.startswith("/storage/v1/object/info/"):
            asset = path.split("rekan-wicara-tutorials/", 1)[-1]
            return (
                httpx.Response(200, json={"size": 50})
                if asset in state["objects"]
                else httpx.Response(400, json={"code": "NoSuchKey"})
            )
        if path == "/storage/v1/object/rekan-wicara-tutorials":
            assert request.method == "DELETE"
            paths = json.loads(request.content)["prefixes"]
            if state["delete_status"] != 200:
                return httpx.Response(state["delete_status"], json={})
            if not state["delete_denied"]:
                state["objects"].difference_update(paths)
            return httpx.Response(200, json=[])
        if path == "/rest/v1/rpc/manage_custom_word":
            body = json.loads(request.content)
            assert "user_id" not in body and "p_user_id" not in body
            if state["rpc_error"]:
                status, code, message = state["rpc_error"]
                return httpx.Response(status, json={"code": code, "message": message})
            action, word_id = body["p_action"], body["p_id"]
            row = next(
                (
                    w
                    for w in state["custom_words"]
                    if w["id"] == word_id and w["user_id"] == state["uid"]
                ),
                None,
            )
            if action == "create":
                if row:
                    return httpx.Response(409, json={"code": "23505"})
                row = {
                    "id": word_id,
                    "user_id": state["uid"],
                    "word": "",
                    "instruction": "",
                    "status": "draft",
                    "revision": 1,
                    "pending_video_paths": [],
                }
            if row is None:
                return httpx.Response(404, json={"code": "PT404", "message": "ITEM_NOT_FOUND"})
            if action in ("save", "begin_delete") and row["revision"] != body["p_revision"]:
                return httpx.Response(409, json={"code": "PT409", "message": "REVISION_CONFLICT"})
            parts = [p for p in state["custom_syllables"] if p["word_id"] == word_id]
            part_ids = {p["id"] for p in parts}
            videos = [
                v
                for v in state["custom_videos"]
                if v["word_id"] == word_id or v["syllable_id"] in part_ids
            ]
            if action == "begin_delete":
                row["status"] = "deleting"
                row["revision"] += 1
                row["pending_video_paths"] = [v["storage_path"] for v in videos]
            elif action == "cleanup":
                row["pending_video_paths"] = [
                    p for p in row["pending_video_paths"] if p not in body["p_cleaned"]
                ]
            elif action == "finish_delete":
                state["custom_words"].remove(row)
                state["custom_syllables"] = [p for p in state["custom_syllables"] if p not in parts]
                state["custom_videos"] = [v for v in state["custom_videos"] if v not in videos]
            elif action in ("create", "save"):
                if row["status"] == "deleting":
                    return httpx.Response(409, json={"code": "PT409", "message": "CLEANUP_PENDING"})
                payload = body["p_payload"]
                expected = []
                if payload["video"]:
                    expected.append(
                        {
                            "id": "word-video",
                            "word_id": word_id,
                            "syllable_id": None,
                            "storage_path": payload.get("video_path")
                            or next(
                                (v["storage_path"] for v in videos if v["word_id"] == word_id), ""
                            ),
                            "sort_order": 1,
                        }
                    )
                for p in payload["syllables"]:
                    if p["video"]:
                        expected.append(
                            {
                                "id": p["id"],
                                "word_id": None,
                                "syllable_id": p["id"],
                                "storage_path": p.get("video_path")
                                or next(
                                    (
                                        v["storage_path"]
                                        for v in videos
                                        if v["syllable_id"] == p["id"]
                                    ),
                                    "",
                                ),
                                "sort_order": 1,
                            }
                        )
                if payload["status"] == "published" and (
                    not payload["instruction"].strip()
                    or not payload["video"]
                    or any(
                        not p["instruction"].strip() or not p["video"] for p in payload["syllables"]
                    )
                    or any(v["storage_path"] not in state["objects"] for v in expected)
                ):
                    return httpx.Response(
                        422, json={"code": "PT422", "message": "INCOMPLETE_MATERIAL"}
                    )
                if action == "create":
                    state["custom_words"].append(row)
                new_paths = {v["storage_path"] for v in expected}
                row["pending_video_paths"] += [
                    v["storage_path"] for v in videos if v["storage_path"] not in new_paths
                ]
                row.update(
                    word=payload["word"],
                    instruction=payload["instruction"],
                    status=payload["status"],
                    revision=row["revision"] + 1,
                )
                state["custom_syllables"] = [
                    p for p in state["custom_syllables"] if p not in parts
                ] + [
                    {
                        "id": p["id"],
                        "word_id": word_id,
                        "syllable": p["text"],
                        "instruction": p["instruction"],
                        "position": p["position"],
                    }
                    for p in payload["syllables"]
                ]
                state["custom_videos"] = [
                    v for v in state["custom_videos"] if v not in videos
                ] + expected
            return httpx.Response(200, json={"id": word_id})
        if path.startswith("/rest/v1/"):
            table = path.rsplit("/", 1)[1]
            if (
                table == "custom_words"
                and state["schema_missing"]
                and "status" in request.url.params.get("select", "")
            ):
                return httpx.Response(400, json={"code": "42703"})
            rows = copy.deepcopy(state[table])
            if table == "custom_words":
                rows = [w for w in rows if w["user_id"] == state["uid"]]
            for key, value in request.url.params.items():
                if value.startswith("eq.") and "." not in key:
                    rows = [row for row in rows if str(row.get(key)) == value[3:]]
            offset = int(request.url.params.get("offset", "0"))
            return httpx.Response(
                200, json=rows[offset : offset + int(request.url.params.get("limit", "200"))]
            )
        raise AssertionError("Unexpected upstream request")

    original = httpx.Client
    monkeypatch.setattr(
        store.httpx,
        "Client",
        lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs),
    )
    return make_client(
        supabase_url="https://project.example.test", supabase_anon_key="public-fixture-key"
    ), state


def payload():
    return {
        "id": WORD,
        "word": "KERTAS",
        "instruction": "Ucapkan KERTAS.",
        "status": "published",
        "video": True,
        "video_path": f"{UID}/words/{WORD}/word/77777777-7777-4777-8777-777777777777.mp4",
        "syllables": [
            {
                "id": KER,
                "text": "KER",
                "instruction": "Ucapkan KER.",
                "position": 1,
                "video": True,
                "video_path": (
                    f"{UID}/words/{WORD}/syllables/{KER}/88888888-8888-4888-8888-888888888888.mp4"
                ),
            },
            {
                "id": TAS,
                "text": "TAS",
                "instruction": "Ucapkan TAS.",
                "position": 2,
                "video": True,
                "video_path": (
                    f"{UID}/words/{WORD}/syllables/{TAS}/99999999-9999-4999-8999-999999999999.mp4"
                ),
            },
        ],
    }


def create(client, body=None):
    result = client.post(BASE, headers=HEADERS, json=payload() if body is None else body)
    assert result.status_code == 201, result.text
    return result.json()


def test_kertas_one_save_reorder_and_delete(manual):
    client, state = manual
    draft = create(client)
    assert draft["status"] == "published" and draft["video"]["available"] is True
    assert client.get(BASE, headers=HEADERS).json()["words"][0]["id"] == WORD
    catalog = client.get("/v2/catalog", headers=HEADERS).json()
    assert len(catalog["level_1"]) == 8 and len(catalog["words"]) == 9
    assert client.get(f"/v2/words/custom_word:{WORD}", headers=HEADERS).status_code == 200
    state["objects"].update(v["storage_path"] for v in state["custom_videos"])
    body = payload() | {"status": "published", "revision": draft["revision"]}
    published = client.patch(f"{BASE}/{WORD}", headers=HEADERS, json=body)
    assert published.status_code == 200 and published.json()["video"]["available"] is True
    body["revision"] = published.json()["revision"]
    body["syllables"][0]["position"], body["syllables"][1]["position"] = 2, 1
    assert client.patch(f"{BASE}/{WORD}", headers=HEADERS, json=body).status_code == 200
    detail = client.get(f"/v2/words/custom_word:{WORD}", headers=HEADERS).json()
    assert [p["text"] for p in detail["level_2"]] == ["TAS", "KER"]
    assert detail["level_2"][0]["videos"][0]["path"] == payload()["syllables"][1]["video_path"]
    assert detail["automatic_evaluation"] is False
    assert any(
        w["id"] == f"custom_word:{WORD}"
        for w in client.get("/v2/catalog", headers=HEADERS).json()["words"]
    )
    assert (
        client.get(f"/v2/items/custom_syllable:{KER}", headers=HEADERS).json()[
            "automatic_evaluation"
        ]
        is False
    )
    current = client.get(f"{BASE}/{WORD}", headers=HEADERS).json()
    deletion = client.delete(f"{BASE}/{WORD}?revision={current['revision']}", headers=HEADERS)
    assert deletion.json()["status"] == "deleted"
    assert state["custom_words"] == state["custom_syllables"] == state["custom_videos"] == []
    assert state["objects"] == set()


@pytest.mark.parametrize(
    "missing",
    ["word_video", "instruction", "syllable_video", "syllable_instruction", "missing_object"],
)
def test_incomplete_update_preserves_existing_metadata(manual, missing):
    client, state = manual
    draft = create(client)
    body = payload() | {"status": "published", "revision": draft["revision"]}
    state["objects"].update(v["storage_path"] for v in state["custom_videos"])
    if missing == "word_video":
        body["video"] = False
    if missing == "instruction":
        body["instruction"] = ""
    if missing == "syllable_video":
        body["syllables"][0]["video"] = False
    if missing == "syllable_instruction":
        body["syllables"][0]["instruction"] = ""
    if missing == "missing_object":
        state["objects"].clear()
    before = copy.deepcopy(state["custom_words"])
    result = client.patch(f"{BASE}/{WORD}", headers=HEADERS, json=body)
    assert result.status_code == 422 and result.json()["detail"]["code"] in (
        "INCOMPLETE_MATERIAL",
        "INVALID_INPUT",
    )
    assert state["custom_words"] == before
    if missing == "missing_object":
        assert len(client.get("/v2/catalog", headers=HEADERS).json()["words"]) == 8


def test_no_syllables_is_valid_and_more_than_two_are_supported(manual):
    client, state = manual
    draft = create(client, payload() | {"syllables": []})
    assert draft["syllables"] == []
    body = payload() | {"revision": draft["revision"]}
    body["syllables"].append(
        {
            "id": "66666666-6666-4666-8666-666666666666",
            "text": "LA",
            "instruction": "Ucapkan LA.",
            "position": 3,
            "video": True,
            "video_path": (
                f"{UID}/words/{WORD}/syllables/66666666-6666-4666-8666-666666666666/"
                "77777777-7777-4777-8777-777777777777.mp4"
            ),
        }
    )
    state["objects"].add(body["syllables"][-1]["video_path"])
    assert len(client.patch(f"{BASE}/{WORD}", headers=HEADERS, json=body).json()["syllables"]) == 3


@pytest.mark.parametrize(
    "kind",
    [
        "empty_word",
        "blank_syllable",
        "duplicate_id",
        "duplicate_position",
        "owner_input",
        "default_id",
        "long_word",
        "nonletters",
        "seven_syllables",
        "empty_instruction",
        "empty_part_instruction",
        "legacy_draft",
        "foreign_video_path",
        "swapped_material_path",
    ],
)
def test_invalid_input_is_rejected_before_any_mutation(manual, kind):
    client, state = manual
    body = payload()
    if kind == "empty_word":
        body["word"] = " "
    if kind == "blank_syllable":
        body["syllables"][0]["text"] = " "
    if kind == "duplicate_id":
        body["syllables"][1]["id"] = KER
    if kind == "duplicate_position":
        body["syllables"][1]["position"] = 1
    if kind == "owner_input":
        body["user_id"] = OTHER
    if kind == "default_id":
        body["id"] = "kp_tolong"
    if kind == "long_word":
        body["word"] = "A" * 31
    if kind == "nonletters":
        body["word"] = "KER TAS1"
    if kind == "seven_syllables":
        body["syllables"] *= 4
    if kind == "empty_instruction":
        body["instruction"] = " \n\t"
    if kind == "empty_part_instruction":
        body["syllables"][0]["instruction"] = " "
    if kind == "legacy_draft":
        body["status"] = "draft"
    if kind == "foreign_video_path":
        body["video_path"] = body["video_path"].replace(UID, OTHER)
    if kind == "swapped_material_path":
        body["syllables"][0]["video_path"] = body["syllables"][1]["video_path"]
    assert client.post(BASE, headers=HEADERS, json=body).status_code == 422
    assert not any(r.method in ("POST", "PATCH", "DELETE") for r in state["calls"])


def test_revision_conflict_and_failed_rpc_do_not_make_followup_writes(manual):
    client, state = manual
    draft = create(client)
    state["calls"].clear()
    state["rpc_error"] = (409, "PT409", "REVISION_CONFLICT")
    result = client.patch(
        f"{BASE}/{WORD}", headers=HEADERS, json=payload() | {"revision": draft["revision"]}
    )
    assert result.status_code == 409
    writes = [r for r in state["calls"] if r.method != "GET"]
    assert len(writes) == 1 and writes[0].url.path.endswith("/rpc/manage_custom_word")


@pytest.mark.parametrize("mode", ["http_failure", "silent_rls_denial"])
def test_delete_cleanup_is_durable_and_can_be_retried(manual, mode):
    client, state = manual
    draft = create(client)
    state["objects"].update(v["storage_path"] for v in state["custom_videos"])
    if mode == "http_failure":
        state["delete_status"] = 503
    else:
        state["delete_denied"] = True
    result = client.delete(f"{BASE}/{WORD}?revision={draft['revision']}", headers=HEADERS)
    assert result.status_code == 200 and result.json()["status"] == "cleanup_pending"
    row = state["custom_words"][0]
    assert row["status"] == "deleting" and len(row["pending_video_paths"]) == 3
    assert state["custom_videos"] and state["objects"]
    assert (
        client.delete(f"{BASE}/{WORD}?revision={draft['revision']}", headers=HEADERS).status_code
        == 409
    )
    state["delete_status"], state["delete_denied"] = 200, False
    assert (
        client.delete(f"{BASE}/{WORD}?revision={row['revision']}", headers=HEADERS).json()["status"]
        == "deleted"
    )
    assert not state["objects"] and not state["custom_words"]


def test_removing_syllable_cleans_only_its_bound_video(manual):
    client, state = manual
    draft = create(client)
    state["objects"].update(v["storage_path"] for v in state["custom_videos"])
    body = payload() | {"revision": draft["revision"]}
    body["syllables"] = body["syllables"][:1]
    response = client.patch(f"{BASE}/{WORD}", headers=HEADERS, json=body)
    assert response.status_code == 200 and response.json()["cleanup_pending"] is False
    assert len(state["objects"]) == 2 and all(
        f"/syllables/{TAS}/" not in p for p in state["objects"]
    )


def test_missing_migration_returns_actionable_error(manual):
    client, state = manual
    state["schema_missing"] = True
    response = client.get(BASE, headers=HEADERS)
    assert (
        response.status_code == 503
        and response.json()["detail"]["code"] == "SCHEMA_MIGRATION_REQUIRED"
    )
    assert client.get("/v2/catalog", headers=HEADERS).status_code == 200


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", BASE),
        ("post", BASE),
        ("get", f"{BASE}/{WORD}"),
        ("patch", f"{BASE}/{WORD}"),
        ("delete", f"{BASE}/{WORD}?revision=1"),
    ],
)
def test_all_crud_requires_jwt(manual, method, path):
    client, state = manual
    result = getattr(client, method)(
        path, **({"json": payload()} if method in ("post", "patch") else {})
    )
    assert result.status_code == 401 and state["calls"] == []


def test_other_account_cannot_read_update_delete_or_see_word_in_catalog(manual):
    client, state = manual
    create(client)
    state["uid"] = OTHER
    state["calls"].clear()
    assert client.get(BASE, headers=HEADERS).json()["words"] == []
    assert client.get(f"{BASE}/{WORD}", headers=HEADERS).status_code == 404
    assert (
        client.patch(
            f"{BASE}/{WORD}", headers=HEADERS, json=payload() | {"revision": 2}
        ).status_code
        == 404
    )
    assert client.delete(f"{BASE}/{WORD}?revision=2", headers=HEADERS).status_code == 404
    assert len(client.get("/v2/catalog", headers=HEADERS).json()["words"]) == 8
    assert not any(r.method != "GET" for r in state["calls"])


@pytest.mark.parametrize("target", [f"custom_word:{WORD}", f"custom_syllable:{KER}"])
def test_manual_material_never_runs_ai(manual, sample_video, monkeypatch, target):
    from unittest.mock import Mock

    from app.api.v2 import analysis

    client, state = manual
    draft = create(client)
    state["objects"].update(v["storage_path"] for v in state["custom_videos"])
    result = client.patch(
        f"{BASE}/{WORD}",
        headers=HEADERS,
        json=payload() | {"revision": draft["revision"], "status": "published"},
    )
    assert result.status_code == 200
    recognize = Mock(side_effect=AssertionError("Manual guides must not run AI"))
    monkeypatch.setattr(analysis, "_recognize", recognize)
    response = client.post(
        "/v2/analyze",
        headers=HEADERS,
        data={"item_id": target, "session_id": "fixture-session"},
        files={"file": ("synthetic.mp4", sample_video, "video/mp4")},
    )
    assert response.status_code == 404 and not recognize.called


def test_invalid_session_is_rejected_before_crud(manual):
    client, state = manual
    state["auth_status"] = 401
    response = client.post(BASE, headers=HEADERS, json=payload())
    assert response.status_code == 401
    assert len(state["calls"]) == 1 and state["calls"][0].url.path == "/auth/v1/user"


def test_replacement_checks_new_object_before_cleanup_and_keeps_old_on_failure(manual):
    client, state = manual
    current = create(client)
    before = copy.deepcopy(
        [state[t] for t in ("custom_words", "custom_syllables", "custom_videos")]
    )
    old = payload()["video_path"]
    body = payload() | {
        "revision": current["revision"],
        "video_path": f"{UID}/words/{WORD}/word/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.mp4",
    }
    state["calls"].clear()
    result = client.patch(f"{BASE}/{WORD}", headers=HEADERS, json=body)
    assert result.status_code == 422 and old in state["objects"]
    assert [state[t] for t in ("custom_words", "custom_syllables", "custom_videos")] == before
    assert not any(r.method == "DELETE" for r in state["calls"])
    state["objects"].add(body["video_path"])
    state["delete_status"] = 503
    result = client.patch(f"{BASE}/{WORD}", headers=HEADERS, json=body)
    assert result.status_code == 200 and result.json()["cleanup_pending"] is True
    assert result.json()["video"]["path"] == body["video_path"]
    assert old in state["objects"]
    state["delete_status"] = 200
    assert client.post(f"{BASE}/{WORD}/cleanup", headers=HEADERS).json()["cleanup_pending"] is False
    assert old not in state["objects"] and body["video_path"] in state["objects"]


def test_thirty_letters_and_six_syllables_are_accepted(manual):
    from uuid import UUID

    client, state = manual
    body = payload() | {"word": "A" * 30, "syllables": []}
    for position in range(1, 7):
        part_id = str(UUID(int=position))
        path = f"{UID}/words/{WORD}/syllables/{part_id}/77777777-7777-4777-8777-777777777777.mp4"
        body["syllables"].append(
            {
                "id": part_id,
                "text": "A",
                "instruction": "Ucapkan A.",
                "position": position,
                "video": True,
                "video_path": path,
            }
        )
        state["objects"].add(path)
    result = create(client, body)
    assert len(result["word"]) == 30 and len(result["syllables"]) == 6


def test_create_requires_stable_id_and_draft_is_hidden_even_when_complete(manual):
    client, state = manual
    body = payload()
    body.pop("id")
    assert client.post(BASE, headers=HEADERS, json=body).status_code == 422
    assert not state["custom_words"]
    create(client)
    state["custom_words"][0]["status"] = "draft"
    assert len(client.get("/v2/catalog", headers=HEADERS).json()["words"]) == 8
    assert client.get(f"/v2/words/custom_word:{WORD}", headers=HEADERS).status_code == 404
