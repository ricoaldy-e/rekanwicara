"""Download only the pinned public inference files; never reads recordings."""

from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

MODEL = "Wikidepia/wav2vec2-xls-r-300m-indonesian"
REVISION = "8a9d507f0804f8e5fca07b17214b2c0266ba7491"
WEIGHTS_SHA256 = "e0068f2a14d76c98bf99a3a656bb6a76f71381675055e2ca43d98516aa143bda"
MODEL_DIR = Path(__file__).resolve().parents[1] / "wav2vec2/.venv/model"
FILES = (
    "config.json", "preprocessor_config.json", "vocab.json", "tokenizer_config.json",
    "special_tokens_map.json", "added_tokens.json", "pytorch_model.bin",
)  # fmt: skip


def sha256(path: Path) -> str:
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def download() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        target = MODEL_DIR / name
        if target.is_file() and (
            sha256(target) == WEIGHTS_SHA256
            if name == "pytorch_model.bin"
            else target.stat().st_size > 0
        ):
            continue
        temporary = target.with_suffix(target.suffix + ".part")
        with (
            urllib.request.urlopen(
                f"https://huggingface.co/{MODEL}/resolve/{REVISION}/{name}", timeout=60
            ) as response,
            temporary.open("wb") as destination,
        ):
            while chunk := response.read(1024 * 1024):
                destination.write(chunk)
        if name == "pytorch_model.bin" and sha256(temporary) != WEIGHTS_SHA256:
            raise ValueError("Hash model tidak cocok; model tidak diaktifkan.")
        temporary.replace(target)
        print(json.dumps({"downloaded": name}), flush=True)


if __name__ == "__main__":
    download()
