from scripts.export_contract import FIXTURE, render_contract


def test_app_contract_matches_server_serialization() -> None:
    assert FIXTURE.read_text(encoding="utf-8") == render_contract(), (
        "Run python -m scripts.export_contract from server/, then app's tsc and Jest."
    )
