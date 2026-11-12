"""Read-only WAV validation and safe CLI errors for isolated speech experiments."""

import argparse
import wave
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from app.core.thresholds import MediaConfig


class PocError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class Failure(BaseModel):
    status: Literal["error"] = "error"
    code: str
    message: str


class Parser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        # argparse's default error can echo a private input path.
        raise PocError("invalid_arguments", "Argumen tidak valid. Gunakan --help.")


def validate_wav(path: Path, config: MediaConfig) -> None:
    if path.suffix != ".wav":
        raise PocError("unsupported_wav", "Gunakan berkas WAV dengan ekstensi .wav huruf kecil.")
    try:
        with wave.open(str(path), "rb") as audio:
            if (
                audio.getcomptype() != "NONE"
                or audio.getsampwidth() != 2
                or audio.getnchannels() != 1
                or audio.getframerate() != config.audio_sample_rate_hz
            ):
                raise PocError("unsupported_wav", "Gunakan WAV PCM 16-bit mono 16 kHz.")
            frames = audio.getnframes()
            if frames == 0:
                raise PocError("empty_wav", "Berkas WAV tidak memiliki sampel audio.")
            if frames / audio.getframerate() > config.max_duration_s:
                raise PocError(
                    "audio_too_long",
                    f"Durasi audio melebihi batas {config.max_duration_s:g} detik.",
                )
            if len(audio.readframes(frames)) != frames * 2:
                raise PocError("invalid_wav", "Data WAV terpotong atau tidak lengkap.")
    except (OSError, EOFError, wave.Error) as exc:
        raise PocError(
            "invalid_wav", "Berkas WAV tidak ditemukan atau tidak dapat dibaca."
        ) from exc
