import csv
import json
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

from tests import test_wav2vec2_poc as shared

load_tool = shared.load_tool
runtime = shared.runtime
wav = shared.wav


@pytest.fixture
def evaluator(monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parents[2] / "ml/tools"))
    return load_tool("wav2vec2_eval", monkeypatch)


@pytest.fixture
def tool(evaluator: ModuleType) -> ModuleType:
    return evaluator.asr


def test_reuses_one_model_and_separates_target_from_ground_truth(
    evaluator: ModuleType, runtime: SimpleNamespace, wav: Path
) -> None:
    runtime.tokenizer.batch_decode = lambda ids: [" ba "]
    before = wav.read_bytes()
    trials = [
        evaluator.Trial(trial_id="T01", file=wav, target="PA", ground_truth="BA"),
        evaluator.Trial(trial_id="T02", file=wav, target="BA", ground_truth="PA"),
        evaluator.Trial(trial_id="T03", file=wav, target="TOLONG"),
    ]
    results = evaluator.evaluate(trials)
    assert [r.raw_transcription for r in results] == [" ba "] * 3
    assert [r.target_match for r in results] == [False, True, False]
    assert [r.ground_truth_match for r in results] == [True, False, None]
    assert all(r.duration_s == 0.1 and r.inference_ms >= 0 for r in results)
    assert runtime.calls == [
        ("extractor", {"local_files_only": True}),
        ("tokenizer", {"local_files_only": True}),
        ("model", {"local_files_only": True, "weights_only": True}),
        "cpu",
        "eval",
    ]
    assert wav.read_bytes() == before


def test_empty_error_and_recovery_are_distinct(
    evaluator: ModuleType, runtime: SimpleNamespace, wav: Path
) -> None:
    texts = iter(["", RuntimeError(str(wav)), "ma"])

    def decode(ids: object) -> list[str]:
        text = next(texts)
        if isinstance(text, Exception):
            raise text
        return [text]

    runtime.tokenizer.batch_decode = decode
    results = evaluator.evaluate(
        [
            evaluator.Trial(trial_id=f"T{i}", file=wav, target="MA", ground_truth="MA")
            for i in range(3)
        ]
    )
    assert [r.status for r in results] == ["empty", "error", "ok"]
    assert [r.ground_truth_match for r in results] == [False, None, True]
    assert results[1].error_code == "inference_error"
    assert "private-recording" not in results[1].model_dump_json()
    summary = evaluator.summarize(results)
    assert summary["recognition_rate"] == 1 / 3
    assert summary["empty"] == summary["errors"] == 1


def test_invalid_audio_is_skipped_and_batch_continues(
    evaluator: ModuleType, runtime: SimpleNamespace, wav: Path
) -> None:
    results = evaluator.evaluate(
        [
            evaluator.Trial(trial_id="bad", file=wav.with_suffix(".mp3"), target="PA"),
            evaluator.Trial(trial_id="good", file=wav, target="PA"),
        ]
    )
    assert [r.status for r in results] == ["error", "ok"]
    assert results[0].error_code == "unsupported_wav"
    assert results[0].raw_transcription is None and results[0].target_match is None


def test_load_failure_is_not_retried(
    evaluator: ModuleType, wav: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls = []

    def fail() -> None:
        calls.append(1)
        raise evaluator.PocError("model_error", "Model gagal dimuat.")

    monkeypatch.setattr(evaluator.asr, "load_recognizer", fail)
    results = evaluator.evaluate(
        [evaluator.Trial(trial_id=f"T{i}", file=wav, target="PA") for i in range(2)]
    )
    assert calls == [1]
    assert all(r.error_code == "model_error" for r in results)
    assert evaluator.summarize(results)["inference_mean_ms"] is None


@pytest.mark.parametrize("text,expected", [("  pa  ", "PA"), ("p a", "P A"), ("pa!", "PA!")])
def test_normalization_never_corrects_spelling(
    evaluator: ModuleType, text: str, expected: str
) -> None:
    assert evaluator.normalize(text) == expected


@pytest.mark.parametrize("value", ["", " ", "PA\nBA"])
def test_rejects_invalid_targets(evaluator: ModuleType, wav: Path, value: str) -> None:
    with pytest.raises(ValueError):
        evaluator.Trial(trial_id="T01", file=wav, target=value)


@pytest.mark.parametrize(
    "contents",
    [
        "trial_id,file,target\n",
        "trial_id,file,target\nT01,a.wav,PA\nT01,b.wav,BA\n",
        "trial_id,file,target\nT01,,PA\n",
        "trial_id,file,target\nT01,a.wav\n",
        "trial_id,file,target\nT01,a.wav,PA,unexpected\n",
        "trial_id,file,target,target\nT01,a.wav,PA,BA\n",
        "trial_id,file,target,extra\nT01,a.wav,PA,x\n",
        "file,target\na.wav,PA\n",
        "trial_id,file,target\nprivate/name,a.wav,PA\n",
    ],
)
def test_rejects_malformed_manifest(evaluator: ModuleType, tmp_path: Path, contents: str) -> None:
    manifest = tmp_path / "private-manifest.csv"
    manifest.write_text(contents)
    with pytest.raises(evaluator.PocError, match="Manifest"):
        evaluator.read_manifest(manifest)


def test_batch_manifest_csv_and_summary(
    evaluator: ModuleType,
    runtime: SimpleNamespace,
    wav: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    manifest = wav.parent / "manifest.csv"
    manifest.write_text(
        "trial_id,file,target,ground_truth,speaker_id\n"
        f"T01,{wav.name},PA,BA,S01\nT02,{wav.name},BA,,S02\n",
        encoding="utf-8-sig",
    )
    output = wav.parent / "results.csv"

    def decode(ids: object) -> list[str]:
        print(str(wav))
        return [" ba "]

    runtime.tokenizer.batch_decode = decode
    assert evaluator.main(["--manifest", str(manifest), "--csv", str(output)]) == 0
    captured = capsys.readouterr()
    assert captured.err == "" and "private" not in captured.out
    summary = json.loads(captured.out)["summary"]
    assert summary["ground_truth_trials"] == summary["ground_truth_matches"] == 1
    assert summary["total"] == 2 and summary["target_matches"] == 1
    with output.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    assert rows[0]["raw_transcription"] == " ba " and rows[0]["speaker_id"] == "S01"
    assert rows[0]["ground_truth_match"] == "True" and rows[0]["target_match"] == "False"
    assert rows[1]["ground_truth_match"] == ""
    assert "file" not in rows[0] and "private-recording" not in output.read_text()
    before = output.read_bytes()
    with pytest.raises(evaluator.PocError, match="nama berkas baru"):
        evaluator.write_csv(output, [])
    assert output.read_bytes() == before


def test_single_cli_and_missing_input_errors_hide_paths(
    evaluator: ModuleType,
    runtime: SimpleNamespace,
    wav: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    args = ["--file", str(wav), "--target", "PA", "--ground-truth", "BA"]
    assert evaluator.main(args) == 0
    result = json.loads(capsys.readouterr().out)["result"]
    assert result["raw_transcription"] == " saya Tuli! " and result["target_match"] is False
    wav.unlink()
    assert evaluator.main(args) == 1
    captured = capsys.readouterr()
    assert json.loads(captured.out)["result"]["error_code"] == "invalid_wav"
    assert "private" not in captured.out + captured.err
    assert evaluator.main(["--file", str(wav)]) == 1
    captured = capsys.readouterr()
    assert json.loads(captured.err)["code"] == "invalid_arguments"
    assert "private" not in captured.err and "Traceback" not in captured.err


def test_private_data_is_never_opened(
    evaluator: ModuleType, monkeypatch: pytest.MonkeyPatch
) -> None:
    private = evaluator.asr.REPO / "data" / "not-opened.wav"
    monkeypatch.setattr(evaluator, "validate_wav", lambda *args: pytest.fail("Must not read"))
    results = evaluator.evaluate([evaluator.Trial(trial_id="T01", file=private, target="PA")])
    assert results[0].error_code == "private_data"
    with pytest.raises(evaluator.PocError, match="folder eksperimen"):
        evaluator.read_manifest(private.with_suffix(".csv"))
    with pytest.raises(evaluator.PocError, match="folder eksperimen"):
        evaluator.write_csv(private.with_suffix(".csv"), [])
