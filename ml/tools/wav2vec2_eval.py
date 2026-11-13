"""Single/batch free CTC recognition, followed by independent text evaluation."""

from __future__ import annotations

import csv
import json
import os
import sys
import wave
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from statistics import mean, median
from typing import Literal

import wav2vec2_poc as asr
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.core.experiment_audio import Failure, Parser, PocError, validate_wav
from app.core.thresholds import load_thresholds


class Trial(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trial_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    file: Path
    target: str
    ground_truth: str | None = None
    speaker_id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,64}$")

    @field_validator("target", "ground_truth")
    @classmethod
    def check_text(cls, value: str | None) -> str | None:
        if value is not None and (not value.strip() or any(ord(c) < 32 for c in value)):
            raise ValueError("Teks harus terisi tanpa karakter kontrol.")
        return value


class Result(BaseModel):
    trial_id: str
    speaker_id: str | None
    target: str
    ground_truth: str | None
    status: Literal["ok", "empty", "error"]
    raw_transcription: str | None = None
    normalized_transcription: str | None = None
    target_match: bool | None = None
    ground_truth_match: bool | None = None
    duration_s: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    inference_ms: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    error_code: str | None = None
    message: str | None = None


def normalize(text: str) -> str:
    return " ".join(text.upper().split())


def check_private_directory(path: Path) -> None:
    if path.resolve().is_relative_to((asr.REPO / "data").resolve()):
        raise PocError("private_data", "Gunakan folder eksperimen terpisah dari data/.")


def read_manifest(path: Path) -> list[Trial]:
    check_private_directory(path)
    try:
        with path.open(encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source, strict=True)
            fields = reader.fieldnames or []
            if (
                not {"trial_id", "file", "target"}.issubset(fields)
                or len(fields) != len(set(fields))
                or set(fields) - set(Trial.model_fields)
            ):
                raise ValueError("columns")
            trials = []
            for row in reader:
                if not row.get("file", "").strip():
                    raise ValueError("file")
                row["file"] = path.parent / row["file"]
                for optional in ("ground_truth", "speaker_id"):
                    if row.get(optional) == "":
                        row[optional] = None
                trials.append(Trial.model_validate(row))
        if not trials or len({trial.trial_id for trial in trials}) != len(trials):
            raise ValueError("ids")
        return trials
    except (OSError, UnicodeError, csv.Error, ValueError, TypeError, AttributeError) as exc:
        raise PocError(
            "invalid_manifest",
            "Manifest tidak valid: periksa kolom, teks, dan ID percobaan yang unik.",
        ) from exc


def evaluate(trials: list[Trial]) -> list[Result]:
    config = load_thresholds().media
    recognize = None
    load_error = None
    results = []
    for trial in trials:
        duration = None
        values = trial.model_dump(exclude={"file"})
        try:
            check_private_directory(trial.file)
            validate_wav(trial.file, config)
            with wave.open(str(trial.file), "rb") as audio:
                duration = audio.getnframes() / audio.getframerate()
            if load_error is not None:
                raise load_error
            if recognize is None:
                try:
                    recognize = asr.load_recognizer()
                except PocError as exc:
                    load_error = exc
                    raise
            prediction = recognize(trial.file)
            text = normalize(prediction.transcription)
            result = Result(
                **values,
                status="ok" if text else "empty",
                raw_transcription=prediction.transcription,
                normalized_transcription=text,
                target_match=text == normalize(trial.target),
                ground_truth_match=(
                    text == normalize(trial.ground_truth)
                    if trial.ground_truth is not None
                    else None
                ),
                duration_s=duration,
                inference_ms=prediction.inference_ms,
            )
        except PocError as exc:
            result = Result(
                **values, status="error", duration_s=duration, error_code=exc.code, message=str(exc)
            )
        except Exception:  # noqa: BLE001 - never expose recording paths from unexpected errors
            result = Result(
                **values,
                status="error",
                duration_s=duration,
                error_code="trial_failed",
                message="Percobaan gagal diproses; periksa audio dan lingkungan lokal.",
            )
        results.append(result)
    return results


def summarize(results: list[Result]) -> dict[str, object]:
    times = [r.inference_ms for r in results if r.inference_ms is not None]
    labeled = [r for r in results if r.ground_truth is not None]
    correct = sum(r.ground_truth_match is True for r in labeled)
    return {
        "total": len(results),
        "ok": sum(r.status == "ok" for r in results),
        "empty": sum(r.status == "empty" for r in results),
        "errors": sum(r.status == "error" for r in results),
        "target_matches": sum(r.target_match is True for r in results),
        "ground_truth_trials": len(labeled),
        "ground_truth_matches": correct,
        "recognition_rate": correct / len(labeled) if labeled else None,
        "inference_mean_ms": mean(times) if times else None,
        "inference_median_ms": median(times) if times else None,
        "inference_max_ms": max(times) if times else None,
    }


def write_csv(path: Path, results: list[Result]) -> None:
    check_private_directory(path)
    if path.suffix.lower() != ".csv":
        raise PocError("invalid_output", "Berkas hasil harus berekstensi .csv.")
    try:
        # Exclusive creation protects existing reports, manifests, and input files.
        with path.open("x", encoding="utf-8-sig", newline="") as destination:
            writer = csv.DictWriter(destination, fieldnames=list(Result.model_fields))
            writer.writeheader()
            writer.writerows(result.model_dump() for result in results)
    except OSError as exc:
        raise PocError(
            "output_error",
            "Hasil tidak dapat ditulis; gunakan folder tersedia dan nama berkas baru.",
        ) from exc


def main(argv: list[str] | None = None) -> int:
    try:
        parser = Parser(description="Evaluasi transkripsi Wav2Vec2 CPU; bukan skor pelafalan.")
        source = parser.add_mutually_exclusive_group(required=True)
        source.add_argument("--file", type=Path, help="WAV PCM 16-bit mono 16 kHz")
        source.add_argument("--manifest", type=Path, help="CSV percobaan dengan target terpisah")
        parser.add_argument(
            "--trial-id", default="trial-001", help="ID anonim tanpa nama/path rekaman"
        )
        parser.add_argument("--target", help="Target evaluasi setelah inferensi")
        parser.add_argument("--ground-truth", help="Transkripsi aktual yang diverifikasi manusia")
        parser.add_argument("--speaker-id", help="Kode penutur anonim, misalnya S01")
        parser.add_argument("--csv", type=Path, help="CSV hasil baru; wajib untuk batch")
        args = parser.parse_args(argv)
        if args.manifest:
            if not args.csv or any((args.target, args.ground_truth, args.speaker_id)):
                raise PocError(
                    "invalid_arguments",
                    "Batch membutuhkan --csv; isi target/ground truth di manifest.",
                )
            trials = read_manifest(args.manifest)
        else:
            trials = [
                Trial(
                    trial_id=args.trial_id,
                    file=args.file,
                    target=args.target,
                    ground_truth=args.ground_truth,
                    speaker_id=args.speaker_id,
                )
            ]
        with open(os.devnull, "w") as sink, redirect_stdout(sink), redirect_stderr(sink):
            results = evaluate(trials)
        if args.csv:
            write_csv(args.csv, results)
        output = {"summary": summarize(results)}
        if args.file:
            output["result"] = results[0].model_dump()
        print(json.dumps(output, ensure_ascii=True))
        return int(any(result.status == "error" for result in results))
    except ValidationError:
        failure = Failure(code="invalid_arguments", message="Target dan ID percobaan tidak valid.")
    except PocError as exc:
        failure = Failure(code=exc.code, message=str(exc))
    except Exception:  # noqa: BLE001 - no private paths or tracebacks in CLI errors
        failure = Failure(code="tool_failed", message="Evaluasi gagal; periksa setup lokal.")
    print(json.dumps(failure.model_dump(), ensure_ascii=True), file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
