"""Local CPU Indonesian transcription; no targets, language model, or network at inference."""

from __future__ import annotations

import json
import os
import sys
import time
import wave
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from typing import Literal

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "server"))
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

from pydantic import BaseModel, Field  # noqa: E402

from app.core.experiment_audio import Failure, Parser, PocError, validate_wav  # noqa: E402
from app.core.thresholds import load_thresholds  # noqa: E402

MODEL = "Wikidepia/wav2vec2-xls-r-300m-indonesian"
MODEL_DIR = REPO / "ml/wav2vec2/.venv/model"


class Prediction(BaseModel):
    status: Literal["success"] = "success"
    model: Literal["Wikidepia/wav2vec2-xls-r-300m-indonesian"] = MODEL
    transcription: str
    inference_ms: float = Field(ge=0, allow_inf_nan=False)


def infer(path: Path) -> Prediction:
    required = ("config.json", "preprocessor_config.json", "vocab.json", "pytorch_model.bin")
    if not all((MODEL_DIR / name).is_file() for name in required):
        raise PocError("model_missing", "Model Wav2Vec2 belum siap. Ikuti docs/WAV2VEC2_POC.md.")
    try:
        import numpy as np
        import torch
        from transformers import Wav2Vec2CTCTokenizer, Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC
    except ImportError as exc:
        raise PocError("dependency_missing", "Gunakan venv eksperimen ml/wav2vec2/.venv.") from exc
    try:
        extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_DIR, local_files_only=True)
        tokenizer = Wav2Vec2CTCTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
        model = (
            Wav2Vec2ForCTC.from_pretrained(MODEL_DIR, local_files_only=True, weights_only=True)
            .to("cpu")
            .eval()
        )
    except Exception as exc:  # noqa: BLE001 - third-party errors may contain paths
        raise PocError("model_error", "Model Wav2Vec2 gagal dimuat.") from exc
    try:
        with wave.open(str(path), "rb") as audio:
            samples = np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2")
            inputs = extractor(
                samples.astype(np.float32) / 32768,
                sampling_rate=audio.getframerate(),
                return_tensors="pt",
            )
        with torch.inference_mode():
            start = time.perf_counter()
            logits = model(**inputs).logits
            # Free greedy CTC decoding: the target never influences recognition.
            text = tokenizer.batch_decode(torch.argmax(logits, dim=-1))[0]
            elapsed = (time.perf_counter() - start) * 1000
        return Prediction(transcription=text, inference_ms=round(elapsed, 3))
    except Exception as exc:  # noqa: BLE001 - third-party errors may contain paths
        raise PocError("inference_error", "Transkripsi gagal dijalankan. Coba rekam lagi.") from exc


def main(argv: list[str] | None = None) -> int:
    try:
        parser = Parser(description="Transkripsi Bahasa Indonesia lokal dengan Wav2Vec2 CPU.")
        parser.add_argument("--file", required=True, type=Path, help="WAV PCM 16-bit mono 16 kHz")
        args = parser.parse_args(argv)
        with open(os.devnull, "w") as sink, redirect_stdout(sink), redirect_stderr(sink):
            validate_wav(args.file, load_thresholds().media)
            result = infer(args.file)
    except PocError as exc:
        failure = Failure(code=exc.code, message=str(exc))
    except Exception:  # noqa: BLE001 - no private paths in unexpected errors
        failure = Failure(code="tool_failed", message="Eksperimen gagal. Periksa setup lokal.")
    else:
        print(json.dumps(result.model_dump(), ensure_ascii=True))
        return 0
    print(json.dumps(failure.model_dump(), ensure_ascii=True), file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
