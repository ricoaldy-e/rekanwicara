"""SPEC §6.1 media preparation: offset, WAV, frames, 4 s cut, and temp-dir cleanup in every case."""

import io
import struct
from collections.abc import Callable
from pathlib import Path

import pytest
import soundfile as sf

from app.core.thresholds import get_thresholds
from app.pipeline import media as media_mod
from app.pipeline.media import (
    MediaError,
    MediaToolsMissing,
    StreamInfo,
    frame_timestamps_ms,
    prepared_media,
)
from tests.conftest import AUDIO_TONE

CFG = get_thresholds().media


def png_size(path: Path) -> tuple[int, int]:
    head = path.read_bytes()[:24]
    assert head[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">II", head[16:24])


def leftovers(root: Path) -> list[Path]:
    return list(root.iterdir()) if root.exists() else []


def test_wav_and_frames(make_clip: Callable[..., Path], tmp_path: Path) -> None:
    clip = make_clip(duration=2.0, size="640x360", rate=30)
    with clip.open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path) as m:
        assert m.wav_path is not None
        info = sf.info(m.wav_path)
        assert (info.samplerate, info.channels, info.subtype) == (16000, 1, "PCM_16")
        assert info.duration == pytest.approx(2.0, abs=0.05)
        # 30 fps source normalised to 15 fps.
        assert len(m.frame_paths) == pytest.approx(30, abs=1)
        assert png_size(m.frame_paths[0]) == (854, 480)  # 16:9 -> width kept even
        assert m.frame_timestamps_ms[:3] == [0, 67, 133]
        assert m.workdir.parent == tmp_path
    assert leftovers(tmp_path) == []


def test_portrait_keeps_aspect(make_clip: Callable[..., Path], tmp_path: Path) -> None:
    clip = make_clip(size="360x640")
    with clip.open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path) as m:
        assert png_size(m.frame_paths[0]) == (270, 480)


def test_cut_to_max_duration(make_clip: Callable[..., Path], tmp_path: Path) -> None:
    clip = make_clip(duration=6.0)
    with clip.open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path) as m:
        assert len(m.frame_paths) == pytest.approx(60, abs=1)  # 4 s x 15 fps
        assert m.wav_path is not None
        assert sf.info(m.wav_path).duration == pytest.approx(4.0, abs=0.05)


def test_av_offset_from_stream_start(make_clip: Callable[..., Path], tmp_path: Path) -> None:
    aligned = make_clip()
    delayed = make_clip(audio_delay_s=0.5)
    with aligned.open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path) as m:
        assert abs(m.av_offset_ms) <= 30
    with delayed.open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path) as m:
        assert m.av_offset_ms == pytest.approx(500, abs=30)


def test_no_audio_stream(make_clip: Callable[..., Path], tmp_path: Path) -> None:
    clip = make_clip(audio=None)
    with clip.open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path) as m:
        assert m.wav_path is None
        assert m.av_offset_ms == 0
        assert m.frame_paths


def test_av_offset_unknown_is_zero() -> None:
    assert StreamInfo(True, True, None, 0.5).av_offset_ms == 0
    assert StreamInfo(True, True, 0.0, 0.0215).av_offset_ms == 22


def test_frame_timestamps_strictly_increasing() -> None:
    ts = frame_timestamps_ms(60, 15)
    assert ts[0] == 0 and ts[-1] == 3933
    assert all(b > a for a, b in zip(ts, ts[1:], strict=False))


# ---------- Temp dir is removed in every case ----------


def test_tempdir_removed_after_success(make_clip: Callable[..., Path], tmp_path: Path) -> None:
    with make_clip().open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path) as m:
        workdir = m.workdir
        assert workdir.exists() and any(workdir.iterdir())
    assert not workdir.exists()
    assert leftovers(tmp_path) == []


def test_tempdir_removed_when_body_raises(make_clip: Callable[..., Path], tmp_path: Path) -> None:
    with pytest.raises(RuntimeError, match="boom"):
        with make_clip().open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path) as m:
            assert m.workdir.exists()
            raise RuntimeError("boom")
    assert leftovers(tmp_path) == []


def test_tempdir_removed_on_corrupt_upload(tmp_path: Path) -> None:
    corrupt = io.BytesIO(b"\x00\x00\x00\x18ftypmp42" + b"\x00garbage" * 500)
    with pytest.raises(MediaError) as err:
        with prepared_media(corrupt, CFG, tmp_root=tmp_path):
            pytest.fail("must not yield for a corrupt file")
    assert err.value.code == "invalid_media"
    assert str(tmp_path) not in str(err.value)  # no paths in error messages
    assert leftovers(tmp_path) == []


def test_tempdir_removed_when_ffmpeg_fails(
    make_clip: Callable[..., Path], tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def failing_extract(*_args: object, **_kwargs: object) -> None:
        raise MediaError("media tool failed (exit 1)")

    monkeypatch.setattr(media_mod, "extract", failing_extract)
    with pytest.raises(MediaError):
        with make_clip().open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path):
            pytest.fail("must not yield")
    assert leftovers(tmp_path) == []


def test_tempdir_removed_when_ffmpeg_times_out(
    make_clip: Callable[..., Path], tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(media_mod, "FFMPEG_TIMEOUT_S", 0.001)
    with pytest.raises(MediaError, match="timed out"):
        with make_clip().open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path):
            pytest.fail("must not yield")
    assert leftovers(tmp_path) == []


def test_tools_missing_creates_nothing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(media_mod.shutil, "which", lambda _name: None)
    with pytest.raises(MediaToolsMissing):
        with prepared_media(io.BytesIO(b"x"), CFG, tmp_root=tmp_path):
            pytest.fail("must not yield")
    assert leftovers(tmp_path) == []


def test_upload_copy_is_deleted_before_yield(
    make_clip: Callable[..., Path], tmp_path: Path
) -> None:
    clip = make_clip(audio=AUDIO_TONE)
    with clip.open("rb") as fh, prepared_media(fh, CFG, tmp_root=tmp_path) as m:
        assert not (m.workdir / "input.mp4").exists()
