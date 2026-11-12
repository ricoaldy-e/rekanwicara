"""Local CPU phone recognition: python ml/tools/allosaurus_poc.py --file clip.wav."""

from __future__ import annotations

import json
import os
import sys
import time
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from typing import Literal

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "server"))

from pydantic import BaseModel  # noqa: E402

from app.core.experiment_audio import Failure, Parser, PocError, validate_wav  # noqa: E402
from app.core.thresholds import load_thresholds  # noqa: E402

MODEL = "uni2005"
PHONE_INVENTORY = REPO / "ml" / "config" / "indonesian_phones.txt"


class Prediction(BaseModel):
    status: Literal["success"] = "success"
    model: Literal["uni2005"] = MODEL
    phonetic_prediction: str
    inference_ms: float


def infer(path: Path) -> Prediction:
    try:
        import allosaurus
        import torch
        from allosaurus.app import read_recognizer
    except ImportError as exc:
        raise PocError(
            "dependency_missing", "Dependency belum siap. Gunakan venv eksperimen ml/.venv."
        ) from exc

    model_path = Path(allosaurus.__file__).parent / "pretrained" / MODEL
    required = (
        "model.pt", "am_config.json", "pm_config.json", "lm_config.json",
        "phone.txt", "inventory/index.json",
    )  # fmt: skip
    if not all((model_path / name).is_file() for name in required):
        raise PocError(
            "model_missing", "Model uni2005 belum lengkap. Ikuti docs/ALLOSAURUS_POC.md."
        )
    try:
        phones = PHONE_INVENTORY.read_text(encoding="utf-8").splitlines()
        supported = {
            line.split()[0]
            for line in (model_path / "phone.txt").read_text(encoding="utf-8").splitlines()
            if line.strip()
        }
        if not phones or len(phones) != len(set(phones)) or not set(phones) <= supported:
            raise ValueError("Invalid phone inventory")
    except (OSError, ValueError) as exc:
        raise PocError("inventory_invalid", "Inventaris bunyi Indonesia belum siap.") from exc
    try:
        recognizer = read_recognizer(MODEL)  # upstream defaults to CPU (device_id=-1)
        recognizer.am.eval()
    except Exception as exc:  # noqa: BLE001 - third-party errors may contain paths
        raise PocError("model_error", "Model uni2005 gagal dimuat.") from exc

    try:
        with torch.inference_mode():
            start = time.perf_counter()
            prediction = recognizer.recognize(str(path), lang_id=str(PHONE_INVENTORY))
            elapsed_ms = (time.perf_counter() - start) * 1000
    except Exception as exc:  # noqa: BLE001 - third-party errors may contain paths
        raise PocError("inference_error", "Prediksi fonetik gagal dijalankan.") from exc
    return Prediction(phonetic_prediction=prediction, inference_ms=round(elapsed_ms, 3))


def main(argv: list[str] | None = None) -> int:
    try:
        parser = Parser(description="Prediksi fonetik lokal dengan Allosaurus CPU.")
        parser.add_argument("--file", required=True, type=Path, help="WAV PCM 16-bit mono 16 kHz")
        args = parser.parse_args(argv)
        # Suppress third-party output, which can contain paths; emit only our result afterwards.
        with open(os.devnull, "w") as sink, redirect_stdout(sink), redirect_stderr(sink):
            config = load_thresholds().media
            validate_wav(args.file, config)
            result = infer(args.file)
    except PocError as exc:
        failure = Failure(code=exc.code, message=str(exc))
    except Exception:  # noqa: BLE001 - prevent unexpected tracebacks exposing input paths
        failure = Failure(code="tool_failed", message="Eksperimen gagal. Periksa setup lokal.")
    else:
        print(json.dumps(result.model_dump(), ensure_ascii=True))
        return 0
    print(json.dumps(failure.model_dump(), ensure_ascii=True), file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
