"""Safety checks for the opt-in Cloud runner; these tests never connect to Supabase."""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from scripts import verify_v2_persistence_cloud as runner


def test_cleanup_plan_has_unique_scope_and_only_targets_its_test_metadata(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(runner, "SERVER", tmp_path)
    (tmp_path / ".venv").mkdir()
    paths = [runner.prepare(), runner.prepare()]
    scopes = []
    for path in paths:
        plan = json.loads(path.read_text(encoding="utf-8"))
        scopes.append(plan["item_id"])
        assert plan["item_id"] == plan["session_id"]
        assert len(set(plan["all_attempt_ids"])) == 4
        assert set(plan["attempt_ids"]) | {plan["invalid_attempt_id"]} == set(
            plan["all_attempt_ids"]
        )
        sql = path.with_name("cleanup.sql").read_text(encoding="utf-8")
        assert sql.count(plan["item_id"]) == 3
        assert all(key in sql for key in plan["all_attempt_ids"])
        assert "delete from public.attempts where id in (" in sql
        assert "delete from public.progress where item_id =" in sql
        assert not any(term in sql.lower() for term in ("alter table", "create policy", "grant "))
        assert not path.with_name("owner-ids.json").exists()
    assert len(set(scopes)) == 2


def test_source_loader_checks_actual_payload_without_cloud_requests(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    server = runner.SERVER
    node = shutil.which("node")
    if node is None or not (server.parent / "app/node_modules/typescript").is_dir():
        pytest.skip("Node and existing application dependencies are required for the SDK runner")
    monkeypatch.setattr(runner, "SERVER", tmp_path)
    (tmp_path / ".venv").mkdir()
    plan = runner.prepare()
    result = subprocess.run(
        [node, str(server / "scripts/verify_v2_persistence_cloud.cjs"), str(plan), "--self-check"],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == {"source_loader_self_check": True, "cloud_requests": 0}
    assert not plan.with_name("results.json").exists()
