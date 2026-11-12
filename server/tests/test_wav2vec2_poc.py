import importlib.util
import io
import json
import sys
import wave
from contextlib import nullcontext
from pathlib import Path
from types import ModuleType, SimpleNamespace

import numpy as np
import pytest


def load_tool(name: str, monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    path = Path(__file__).resolve().parents[2] / "ml/tools" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(f"{name}_test", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, spec.name, module)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def tool(monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    return load_tool("wav2vec2_poc", monkeypatch)


@pytest.fixture
def wav(tmp_path: Path) -> Path:
    path = tmp_path / "private-recording.wav"
    with wave.open(str(path), "wb") as audio:
        audio.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
        audio.writeframes(b"\0" * 3200)
    return path


@pytest.fixture
def runtime(tool: ModuleType, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    directory = tmp_path / "model"
    directory.mkdir()
    for name in ("config.json", "preprocessor_config.json", "vocab.json", "pytorch_model.bin"):
        (directory / name).touch()
    monkeypatch.setattr(tool, "MODEL_DIR", directory)
    calls: list[object] = []

    class Model:
        def to(self, device: str) -> "Model":
            calls.append(device)
            return self

        def eval(self) -> "Model":
            calls.append("eval")
            return self

        def __call__(self, **inputs: object) -> SimpleNamespace:
            return SimpleNamespace(logits=np.zeros((1, 8, 32)))

    def extractor(samples: np.ndarray, **kwargs: object) -> dict[str, object]:
        assert samples.dtype == np.float32 and len(samples) == 1600
        assert kwargs == {"sampling_rate": 16000, "return_tensors": "pt"}
        return {"input_values": samples}

    tokenizer = SimpleNamespace(batch_decode=lambda ids: [" saya Tuli! "])

    def loader(name: str, value: object) -> SimpleNamespace:
        def load(path: Path, **kwargs: object) -> object:
            assert path == directory
            calls.append((name, kwargs))
            return value

        return SimpleNamespace(from_pretrained=load)

    transformers = ModuleType("transformers")
    transformers.Wav2Vec2FeatureExtractor = loader("extractor", extractor)
    transformers.Wav2Vec2CTCTokenizer = loader("tokenizer", tokenizer)
    transformers.Wav2Vec2ForCTC = loader("model", Model())
    torch = ModuleType("torch")
    torch.inference_mode = nullcontext
    torch.argmax = lambda logits, dim: np.argmax(logits, axis=dim)
    monkeypatch.setitem(sys.modules, "transformers", transformers)
    monkeypatch.setitem(sys.modules, "torch", torch)
    return SimpleNamespace(
        calls=calls, tokenizer=tokenizer, transformers=transformers, directory=directory
    )


@pytest.mark.parametrize("text", [" saya Tuli! ", "", "makan bukan tolong"])
def test_local_cpu_recognition_keeps_raw_text_and_input(
    tool: ModuleType,
    runtime: SimpleNamespace,
    wav: Path,
    capsys: pytest.CaptureFixture[str],
    text: str,
) -> None:
    def decode(ids: object) -> list[str]:
        print(f"private log {wav}")
        print(f"private warning {wav}", file=sys.stderr)
        return [text]

    runtime.tokenizer.batch_decode = decode
    before = wav.read_bytes()
    assert tool.main(["--file", str(wav)]) == 0
    output = capsys.readouterr()
    result = json.loads(output.out)
    assert result["model"] == tool.MODEL and result["transcription"] == text
    assert result["inference_ms"] >= 0 and result["status"] == "success"
    assert output.err == "" and "private" not in output.out
    assert runtime.calls == [
        ("extractor", {"local_files_only": True}),
        ("tokenizer", {"local_files_only": True}),
        ("model", {"local_files_only": True, "weights_only": True}),
        "cpu",
        "eval",
    ]
    assert wav.read_bytes() == before


@pytest.mark.parametrize(
    "kind",
    ["missing", "empty", "corrupt", "truncated", "stereo", "rate", "width", "long", "no_samples"],
)
def test_invalid_audio_never_reaches_model(
    tool: ModuleType,
    wav: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    kind: str,
) -> None:
    if kind == "missing":
        wav.unlink()
    elif kind in ("empty", "corrupt", "truncated"):
        wav.write_bytes(
            {"empty": b"", "corrupt": b"not wav", "truncated": wav.read_bytes()[:-1]}[kind]
        )
    else:
        channels = 2 if kind == "stereo" else 1
        width = 3 if kind == "width" else 2
        frames = 64001 if kind == "long" else 0 if kind == "no_samples" else 1600
        with wave.open(str(wav), "wb") as audio:
            audio.setparams(
                (channels, width, 8000 if kind == "rate" else 16000, 0, "NONE", "not compressed")
            )
            audio.writeframes(b"\0" * frames * channels * width)
    before = wav.read_bytes() if wav.exists() else None
    monkeypatch.setattr(tool, "infer", lambda _: pytest.fail("Must not run"))
    assert tool.main(["--file", str(wav)]) == 1
    output = capsys.readouterr()
    assert output.out == "" and json.loads(output.err)["status"] == "error"
    assert "private" not in output.err and "Traceback" not in output.err
    assert (wav.read_bytes() if wav.exists() else None) == before


@pytest.mark.parametrize(
    "stage,code",
    [
        ("missing", "model_missing"),
        ("load", "model_error"),
        ("infer", "inference_error"),
        ("dependency", "dependency_missing"),
    ],
)
def test_runtime_failures_hide_paths(
    tool: ModuleType,
    runtime: SimpleNamespace,
    wav: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    stage: str,
    code: str,
) -> None:
    def fail(*args: object, **kwargs: object) -> None:
        raise RuntimeError(str(wav))

    if stage == "missing":
        (runtime.directory / "pytorch_model.bin").unlink()
    elif stage == "load":
        runtime.transformers.Wav2Vec2ForCTC.from_pretrained = fail
    elif stage == "infer":
        runtime.tokenizer.batch_decode = fail
    else:
        monkeypatch.setitem(sys.modules, "transformers", None)
    assert tool.main(["--file", str(wav)]) == 1
    output = capsys.readouterr()
    assert output.out == "" and json.loads(output.err)["code"] == code
    assert "private" not in output.err and "Traceback" not in output.err


def test_downloader_rejects_bad_weights_and_skips_verified_files(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    tool = load_tool("download_wav2vec2", monkeypatch)
    monkeypatch.setattr(tool, "MODEL_DIR", tmp_path)
    monkeypatch.setattr(tool, "FILES", ("pytorch_model.bin",))
    monkeypatch.setattr(tool.urllib.request, "urlopen", lambda *args, **kwargs: io.BytesIO(b"bad"))
    with pytest.raises(ValueError, match="Hash"):
        tool.download()
    assert not (tmp_path / "pytorch_model.bin").exists()
    target = tmp_path / "pytorch_model.bin"
    target.write_bytes(b"good")
    monkeypatch.setattr(tool, "WEIGHTS_SHA256", tool.sha256(target))
    monkeypatch.setattr(
        tool.urllib.request, "urlopen", lambda *args, **kwargs: pytest.fail("No download")
    )
    tool.download()
