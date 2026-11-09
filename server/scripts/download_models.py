"""Download the MediaPipe Face Landmarker model bundle into server/models/.

Source (official, verified 10 Nov 2026 on the Face Landmarker guide, "Models" section):
https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
The guide only publishes the "latest" path (no versioned URL or checksum), so this script prints the
SHA-256 of what it downloaded. Record it when it changes (see server/README.md).

Usage (from server/):  python scripts/download_models.py [--force]
"""

from __future__ import annotations

import argparse
import hashlib
import sys
import urllib.request
from pathlib import Path

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/latest/face_landmarker.task"
)
MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
MODEL_PATH = MODELS_DIR / "face_landmarker.task"
_CHUNK = 1024 * 1024


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        while chunk := fh.read(_CHUNK):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, dest: Path, timeout_s: float = 60.0) -> None:
    """Stream ``url`` to ``dest`` via a ``.part`` file; ``dest`` only appears when complete."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_name(dest.name + ".part")
    try:
        with urllib.request.urlopen(url, timeout=timeout_s) as resp, part.open("wb") as out:  # noqa: S310
            while chunk := resp.read(_CHUNK):
                out.write(chunk)
        part.replace(dest)
    finally:
        part.unlink(missing_ok=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--force", action="store_true", help="download even if the file exists")
    args = parser.parse_args(argv)

    if MODEL_PATH.exists() and not args.force:
        print(f"Sudah ada: {MODEL_PATH} (pakai --force untuk mengunduh ulang)")
    else:
        print(f"Mengunduh {MODEL_URL}")
        try:
            download(MODEL_URL, MODEL_PATH)
        except OSError as exc:  # URLError/HTTPError/timeouts are OSError subclasses
            print(f"Gagal mengunduh: {exc}", file=sys.stderr)
            return 1

    size_mb = MODEL_PATH.stat().st_size / (1024 * 1024)
    print(f"Berkas : {MODEL_PATH}")
    print(f"Ukuran : {size_mb:.2f} MB")
    print(f"SHA-256: {sha256_of(MODEL_PATH)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
