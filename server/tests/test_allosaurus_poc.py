import importlib.util
import json
import sys
import wave
from contextlib import nullcontext
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest


@pytest.fixture
def tool(monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    path = Path(__file__).resolve().parents[2] / "ml/tools/allosaurus_poc.py"
    spec = importlib.util.spec_from_file_location("allosaurus_poc_test", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, spec.name, module)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def wav(tmp_path: Path) -> Path:
    path = tmp_path / "private-recording.wav"
    write_wav(path)
    return path


def write_wav(
    path: Path, *, channels: int = 1, width: int = 2, sr: int = 16000, frames: int = 1600
) -> None:
    with wave.open(str(path), "wb") as audio:
        audio.setparams((channels, width, sr, 0, "NONE", "not compressed"))
        audio.writeframes(b"\0" * frames * channels * width)


@pytest.fixture
def runtime(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, tool: ModuleType) -> SimpleNamespace:
    calls: list[object] = []
    package = ModuleType("allosaurus")
    package.__file__ = str(tmp_path / "allosaurus/__init__.py")
    model_dir = tmp_path / "allosaurus/pretrained/uni2005"
    for name in (
        "model.pt",
        "am_config.json",
        "pm_config.json",
        "lm_config.json",
        "phone.txt",
        "inventory/index.json",
    ):
        path = model_dir / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch()
    (model_dir / "phone.txt").write_text(
        tool.PHONE_INVENTORY.read_text(encoding="utf-8"), encoding="utf-8"
    )
    recognizer = SimpleNamespace(
        am=SimpleNamespace(eval=lambda: calls.append("eval")),
        recognize=lambda path, **kwargs: calls.append((path, kwargs)) or " m ɑ  m a\n",
    )
    app = ModuleType("allosaurus.app")

    def read(name: str) -> SimpleNamespace:
        calls.append(name)
        return recognizer

    app.read_recognizer = read
    torch = ModuleType("torch")
    torch.inference_mode = nullcontext
    monkeypatch.setitem(sys.modules, "allosaurus", package)
    monkeypatch.setitem(sys.modules, "allosaurus.app", app)
    monkeypatch.setitem(sys.modules, "torch", torch)
    return SimpleNamespace(calls=calls, recognizer=recognizer, app=app, model_dir=model_dir)


@pytest.mark.parametrize("prediction", [" m ɑ  m a\n", ""])
def test_success_keeps_raw_prediction_and_input(
    tool: ModuleType,
    runtime: SimpleNamespace,
    wav: Path,
    capsys: pytest.CaptureFixture[str],
    prediction: str,
) -> None:
    def recognize(path: str, **kwargs: object) -> str:
        runtime.calls.append((path, kwargs))
        print(f"private output {wav}")
        print(f"private warning {wav}", file=sys.stderr)
        return prediction

    runtime.recognizer.recognize = recognize
    before = wav.read_bytes()
    assert tool.main(["--file", str(wav)]) == 0
    output = capsys.readouterr()
    result = json.loads(output.out)
    assert result == {
        "status": "success",
        "model": "uni2005",
        "phonetic_prediction": prediction,
        "inference_ms": result["inference_ms"],
    }
    assert result["inference_ms"] >= 0
    assert output.err == "" and str(wav) not in output.out
    assert runtime.calls == ["uni2005", "eval", (str(wav), {"lang_id": str(tool.PHONE_INVENTORY)})]
    assert wav.read_bytes() == before


@pytest.mark.parametrize(
    "kind,code",
    [
        ("missing", "invalid_wav"),
        ("empty", "invalid_wav"),
        ("corrupt", "invalid_wav"),
        ("truncated", "invalid_wav"),
        ("no_samples", "empty_wav"),
        ("stereo", "unsupported_wav"),
        ("rate", "unsupported_wav"),
        ("width", "unsupported_wav"),
        ("long", "audio_too_long"),
    ],
)
def test_bad_audio_fails_before_inference(
    tool: ModuleType,
    wav: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    kind: str,
    code: str,
) -> None:
    if kind == "missing":
        wav.unlink()
    elif kind in ("empty", "corrupt"):
        wav.write_bytes(b"" if kind == "empty" else b"not wav")
    elif kind == "truncated":
        wav.write_bytes(wav.read_bytes()[:-1])
    else:
        options = {
            "no_samples": {"frames": 0},
            "stereo": {"channels": 2},
            "rate": {"sr": 44100},
            "width": {"width": 3},
            "long": {"frames": 64001},
        }
        write_wav(wav, **options[kind])
    before = wav.read_bytes() if wav.exists() else None
    monkeypatch.setattr(tool, "infer", lambda _: pytest.fail("Inference must not run"))
    assert tool.main(["--file", str(wav)]) == 1
    output = capsys.readouterr()
    assert output.out == ""
    assert json.loads(output.err)["code"] == code
    assert str(wav) not in output.err and "private" not in output.err
    assert (wav.read_bytes() if wav.exists() else None) == before


@pytest.mark.parametrize(
    "stage,code",
    [
        ("dependency", "dependency_missing"),
        ("missing", "model_missing"),
        ("load", "model_error"),
        ("inference", "inference_error"),
    ],
)
def test_runtime_errors_are_safe(
    tool: ModuleType,
    runtime: SimpleNamespace,
    wav: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    stage: str,
    code: str,
) -> None:
    def fail(*args: object, **kwargs: object) -> None:
        print(str(wav))
        raise RuntimeError(str(wav))

    if stage == "dependency":
        monkeypatch.setitem(sys.modules, "allosaurus", None)
    elif stage == "missing":
        (runtime.model_dir / "model.pt").unlink()
        runtime.app.read_recognizer = lambda _: pytest.fail("Must not load or download")
    elif stage == "load":
        runtime.app.read_recognizer = fail
    else:
        runtime.recognizer.recognize = fail
    before = wav.read_bytes()
    assert tool.main(["--file", str(wav)]) == 1
    output = capsys.readouterr()
    assert output.out == "" and json.loads(output.err)["code"] == code
    assert str(wav) not in output.err and "Traceback" not in output.err
    assert wav.read_bytes() == before


def test_argument_error_does_not_echo_path(
    tool: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    assert tool.main(["--file", "private.wav", "private-extra.wav"]) == 1
    output = capsys.readouterr()
    assert json.loads(output.err)["code"] == "invalid_arguments"
    assert "private" not in output.err


def test_duration_limit_is_loaded_from_config(
    tool: ModuleType,
    wav: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    config = tool.load_thresholds().media.model_copy(update={"max_duration_s": 0.05})
    monkeypatch.setattr(tool, "load_thresholds", lambda: SimpleNamespace(media=config))
    assert tool.main(["--file", str(wav)]) == 1


@pytest.mark.parametrize("content", [None, "", "a\na\n", "unsupported_phone\n"])
def test_invalid_inventory_never_falls_back_to_universal(
    tool: ModuleType,
    runtime: SimpleNamespace,
    wav: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    content: str | None,
) -> None:
    inventory = tmp_path / "phones.txt"
    if content is not None:
        inventory.write_text(content, encoding="utf-8")
    monkeypatch.setattr(tool, "PHONE_INVENTORY", inventory)
    assert tool.main(["--file", str(wav)]) == 1
    output = capsys.readouterr()
    assert json.loads(output.err)["code"] == "inventory_invalid"
    assert runtime.calls == []
    assert str(inventory) not in output.err


def test_inventory_covers_indonesian_affricates(tool: ModuleType) -> None:
    assert {"tʃ", "dʒ", "j", "ŋ", "ɲ", "ə"} <= set(
        tool.PHONE_INVENTORY.read_text(encoding="utf-8").splitlines()
    )
