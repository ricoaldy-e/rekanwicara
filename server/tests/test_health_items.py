from fastapi.testclient import TestClient

from app.api.schemas import HealthResponse, Item


def test_health_matches_contract(client: TestClient) -> None:
    res = client.get("/v1/health")
    assert res.status_code == 200
    body = res.json()
    HealthResponse.model_validate(body)
    assert body == {
        "status": "ok",
        "engine_version": "0.1.0",
        "scorer_mode": "rules",
        "mock_mode": True,
    }


def test_health_reflects_settings(make_client) -> None:
    res = make_client(mock_mode=False, scorer_mode="hybrid", engine_version="9.9.9").get(
        "/v1/health"
    )
    assert res.json() == {
        "status": "ok",
        "engine_version": "9.9.9",
        "scorer_mode": "hybrid",
        "mock_mode": False,
    }


def test_items_returns_only_active_items(client: TestClient) -> None:
    res = client.get("/v1/items")
    assert res.status_code == 200
    items = [Item.model_validate(i) for i in res.json()]
    ids = {i.item_id for i in items}

    required = {
        "l0_hold_a", "l0_soft_loud",
        "l1_a", "l1_i", "l1_u", "l1_m",
        "l2_ma", "l2_mi", "l2_mu", "l2_pa", "l2_pi", "l2_pu", "l2_ba", "l2_bi", "l2_bu",
        "l3_mama", "l3_papa", "l3_bibi", "l3_pipi", "l3_apa", "l3_abu", "l3_ibu", "l3_ubi",
        "l3_bumi",
    }  # fmt: skip
    assert ids == required
    assert all(i.active and i.priority == "required" for i in items)


def test_item_shape_matches_spec_example(client: TestClient) -> None:
    mama = next(i for i in client.get("/v1/items").json() if i["item_id"] == "l3_mama")
    assert mama == {
        "item_id": "l3_mama",
        "level": 3,
        "text": "mama",
        "units": ["ma", "ma"],
        "priority": "required",
        "emoji": "👩",
        "active": True,
    }


def test_unknown_route_uses_error_format(client: TestClient) -> None:
    res = client.get("/v1/does-not-exist")
    assert res.status_code == 404
    assert res.json()["detail"]["code"] == "not_found"


def test_cors_is_open(client: TestClient) -> None:
    res = client.options(
        "/v1/health",
        headers={"Origin": "http://192.168.1.20:8081", "Access-Control-Request-Method": "GET"},
    )
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == "*"
