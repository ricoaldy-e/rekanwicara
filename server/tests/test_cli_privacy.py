import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

from app.core.cli import run_cli


@pytest.mark.parametrize("code", [None, 0, 1])
def test_cli_preserves_exit_codes(code: int | None) -> None:
    with pytest.raises(SystemExit) as result:
        run_cli(lambda: code)
    assert result.value.code == code


def test_cli_hides_paths_in_unexpected_errors(capsys: pytest.CaptureFixture[str]) -> None:
    def fail() -> int:
        raise FileNotFoundError("private-recording.mp4")

    with pytest.raises(SystemExit) as result:
        run_cli(fail)
    assert result.value.code == 1
    output = capsys.readouterr()
    assert output.out == ""
    assert output.err == "tool_failed type=FileNotFoundError\n"


def load_tool(relative: str) -> ModuleType:
    path = Path(__file__).resolve().parents[2] / relative
    spec = importlib.util.spec_from_file_location("privacy_tool", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize("fails", [False, True])
def test_processing_keeps_counts_and_local_failures_without_leaking_names(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], fails: bool
) -> None:
    tool = load_tool("ml/dataset/process.py")
    model = tmp_path / "model.task"
    model.touch()
    monkeypatch.setattr(tool, "MODEL", model)
    monkeypatch.setattr(sys, "argv", ["process.py", "--data-dir", str(tmp_path)])
    monkeypatch.setattr(tool, "read_metadata", lambda _: [{"clip_id": "private-clip"}])
    monkeypatch.setattr(tool, "load_content", lambda: SimpleNamespace(items=[]))
    monkeypatch.setattr(tool, "load_thresholds", lambda: None)
    monkeypatch.setattr(tool, "thresholds_sha", lambda: "test")
    monkeypatch.setattr(tool, "is_processed", lambda *_: False)
    monkeypatch.setattr(tool, "clip_path", lambda *_: tmp_path / "private-recording.mp4")
    monkeypatch.setattr(tool, "write_auto_labels", lambda *_: 1)

    def process(*_: object) -> dict[str, object]:
        if fails:
            raise OSError("private-recording.mp4 could not be opened")
        return {"status": "ok", "quality_flags": []}

    monkeypatch.setattr(tool, "process_clip", process)
    assert tool.main() == int(fails)
    output = capsys.readouterr().out
    assert "private" not in output and str(tmp_path) not in output
    assert "auto labels: 1 rows" in output
    errors = json.loads((tmp_path / "processed/_failures.json").read_text())
    assert errors == ([{"clip_id": "private-clip", "error": "OSError"}] if fails else [])
