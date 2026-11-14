from scripts.export_contract import FIXTURE, V2_FIXTURE, render_contract, render_v2_contract


def test_app_contract_matches_server_serialization() -> None:
    assert FIXTURE.read_text(encoding="utf-8") == render_contract(), (
        "Run python -m scripts.export_contract from server/, then app's tsc and Jest."
    )


def test_app_v2_contract_matches_server_serialization() -> None:
    assert V2_FIXTURE.read_text(encoding="utf-8") == render_v2_contract()
