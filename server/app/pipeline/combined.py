"""MediaPipe speaking indication plus free Wav2Vec2 text; no Parselmouth in this path."""

import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

from app.api.schemas import (
    CombinedAudio,
    CombinedResponse,
    CombinedTimings,
    CombinedVisual,
    CommunicationTarget,
    ExperimentFailure,
    LipContour,
    SpeechFeedback,
    Wav2Vec2Response,
)
from app.core.thresholds import Thresholds
from app.pipeline.face import FaceModelMissing, face_metrics, face_quality_flags, track_faces
from app.pipeline.lips import default_lip_rest, lip_contour, lip_series
from app.pipeline.media import PreparedMedia
from app.pipeline.text_match import normalize_text, text_outcome


@dataclass(frozen=True)
class AudioActivity:
    result: CombinedAudio
    starts_ms: np.ndarray
    ends_ms: np.ndarray


def observe_audio(media: PreparedMedia, thresholds: Thresholds) -> AudioActivity:
    samples, sr = sf.read(media.wav_path, dtype="float64", always_2d=False)
    cfg = thresholds.experiments
    width = max(1, round(sr * cfg.activity_frame_ms / 1000))
    padded = np.pad(samples, (0, (-len(samples)) % width)).reshape(-1, width)
    rms = np.sqrt(np.mean(padded * padded, axis=1))
    active = rms >= cfg.activity_rms_min
    starts = np.arange(len(rms)) * width * 1000 / sr
    ends = np.minimum(starts + width * 1000 / sr, len(samples) * 1000 / sr)
    active_ms = round(float(np.sum((ends - starts)[active])))
    warnings = (
        ["silent"] if not active.any() else ["too_short"] if active_ms < cfg.activity_min_ms else []
    )
    return AudioActivity(
        result=CombinedAudio(
            duration_ms=round(len(samples) * 1000 / sr), active_ms=active_ms, warnings=warnings
        ),
        starts_ms=starts[active],
        ends_ms=ends[active],
    )


def observe_visual(
    media: PreparedMedia,
    thresholds: Thresholds,
    model: Path,
    activity: AudioActivity | None,
) -> CombinedVisual:
    track = track_faces(media.frame_paths, media.frame_timestamps_ms, model)
    metrics = face_metrics(track.frames, thresholds.lips.landmarks)
    warnings = face_quality_flags(metrics, thresholds.quality)
    series = lip_series(
        track.frames,
        track.image_size,
        media.av_offset_ms,
        thresholds.lips,
        default_lip_rest(thresholds),
    )
    cfg = thresholds.experiments
    eligible = np.array([frame.has_face for frame in track.frames], dtype=bool)
    eligible &= np.isfinite(series.lip_gap_ratio) & np.isfinite(series.lip_width_ratio)
    if activity is None or not len(activity.starts_ms):
        eligible[:] = False
    else:
        overlap = (activity.starts_ms[None, :] <= series.t_ms[:, None] + cfg.activity_margin_ms) & (
            activity.ends_ms[None, :] >= series.t_ms[:, None] - cfg.activity_margin_ms
        )
        eligible &= overlap.any(axis=1)
    adjacent = eligible[:-1] & eligible[1:]
    steps = np.maximum(
        np.abs(np.diff(series.lip_gap_ratio)), np.abs(np.diff(series.lip_width_ratio))
    )
    motion_steps = int(np.sum(adjacent & (steps >= cfg.motion_step_min)))
    span = (
        max(
            float(np.ptp(series.lip_gap_ratio[eligible])),
            float(np.ptp(series.lip_width_ratio[eligible])),
        )
        if eligible.any()
        else 0.0
    )
    # shortcut: co-occurrence only indicates speaking; use audiovisual verification for attribution.
    if motion_steps < cfg.motion_steps_min or span < cfg.motion_range_min:
        warnings.append("motion_missing")
    visible = [frame for frame in track.frames if frame.has_face]
    contour = None
    if visible:
        points = lip_contour(visible[len(visible) // 2], track.image_size, thresholds.lips)
        if points is not None and np.isfinite(points).all():
            contour = LipContour(
                points=[(round(float(x), 4), round(float(y), 4)) for x, y in points]
            )
    return CombinedVisual(
        n_frames=metrics.n_frames,
        face_frames=metrics.face_frames,
        warnings=warnings,
        gate="retry" if warnings else "passed",
        motion_steps=motion_steps,
        lip_contour=contour,
    )


def feedback(
    target: CommunicationTarget,
    audio: CombinedAudio | ExperimentFailure,
    visual: CombinedVisual | ExperimentFailure,
    asr: Wav2Vec2Response | ExperimentFailure,
    thresholds: Thresholds,
) -> SpeechFeedback:
    if any(isinstance(result, ExperimentFailure) for result in (audio, visual, asr)):
        return SpeechFeedback(outcome=None, reason="component_unavailable")
    if audio.warnings:
        return SpeechFeedback(
            outcome="coba_lagi",
            reason="silent_audio" if "silent" in audio.warnings else "short_audio",
        )
    if visual.gate != "passed":
        return SpeechFeedback(outcome="coba_lagi", reason="visual_gate")
    if not normalize_text(asr.transcription):
        return SpeechFeedback(outcome="coba_lagi", reason="empty_text")
    outcome = text_outcome(target, asr.transcription, thresholds.experiments)
    reason = {"berhasil": "matched", "mendekati": "near_match", "coba_lagi": "different_text"}[
        outcome
    ]
    return SpeechFeedback(outcome=outcome, reason=reason)


def analyze_combined(
    media: PreparedMedia,
    thresholds: Thresholds,
    model_path: Path,
    recognize: Callable[[Path], Wav2Vec2Response],
    media_ms: int,
    target: CommunicationTarget,
) -> CombinedResponse:
    start = time.perf_counter()
    activity = None
    try:
        activity = observe_audio(media, thresholds)
        audio = activity.result
    except Exception:  # noqa: BLE001 - no private paths or fabricated measurements
        audio = ExperimentFailure(code="audio_analysis_failed")
    audio_ms = round((time.perf_counter() - start) * 1000)
    start = time.perf_counter()
    try:
        visual = observe_visual(media, thresholds, model_path, activity)
    except FaceModelMissing:
        visual = ExperimentFailure(code="face_model_missing")
    except Exception:  # noqa: BLE001 - no traceback or temporary paths
        visual = ExperimentFailure(code="face_analysis_failed")
    visual_ms = round((time.perf_counter() - start) * 1000)
    start = time.perf_counter()
    try:
        asr = recognize(media.wav_path)
    except Exception as exc:  # noqa: BLE001 - keep only known public codes
        code = getattr(exc, "code", None)
        if code not in ("wav2vec2_timeout", "wav2vec2_invalid_result"):
            code = "wav2vec2_unavailable"
        asr = ExperimentFailure(code=code)
    asr_ms = round((time.perf_counter() - start) * 1000)
    return CombinedResponse(
        status="partial"
        if any(isinstance(result, ExperimentFailure) for result in (audio, visual, asr))
        else "complete",
        target=target,
        feedback=feedback(target, audio, visual, asr, thresholds),
        audio=audio,
        visual=visual,
        asr=asr,
        timings=CombinedTimings(
            media_ms=media_ms, audio_ms=audio_ms, visual_ms=visual_ms, asr_ms=asr_ms
        ),
        processing_ms=0,
    )
