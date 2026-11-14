"""Five v2 vowels: measured lips/acoustics plus free ASR, never target-biased decoding."""

import math
import time
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
import soundfile as sf

from app.api.schemas import (
    FormantPoint,
    Item,
    LipContour,
    Loudness,
    Status,
    V2AnalyzeResponse,
    V2Feedback,
    V2Result,
    Visuals,
    VowelAnchors,
)
from app.api.v1.wav2vec2 import _recognize
from app.core.settings import Settings
from app.core.thresholds import Thresholds
from app.pipeline import calibration as calib
from app.pipeline.audio import vowel_median
from app.pipeline.features import ClipFeatures
from app.pipeline.hints import retry_hint
from app.pipeline.lips import lip_contour, middle_median, span_peak
from app.pipeline.rules import at_least, at_most, vowel_checks, worst
from app.pipeline.segment import speech_region
from app.pipeline.text_match import normalize_text

VOWEL_IDS = frozenset(f"l1_{vowel}" for vowel in "aiueo")
RESULTS: dict[Status, V2Result] = {
    "hijau": "sesuai",
    "kuning": "mendekati",
    "merah": "belum_sesuai",
}


def evaluate_vowel(
    item: Item,
    feats: ClipFeatures,
    calibration: calib.Calibration | None,
    thresholds: Thresholds,
    settings: Settings,
    start: float,
) -> V2AnalyzeResponse:
    vowel = item.units[0]
    flags = list(feats.quality_flags)
    extra = [] if calibration is not None and calibration.complete else ["uncalibrated"]

    def response(
        code: str,
        message: str,
        lip: Status | None = None,
        voice: Status | None = None,
        visuals: Visuals | None = None,
        warnings: list[str] | None = None,
    ) -> V2AnalyzeResponse:
        result = None if lip is None or voice is None else worst([lip, voice])
        return V2AnalyzeResponse(
            status="retry" if result is None else "evaluated",
            item_id=item.item_id,
            level=1,
            result=None if result is None else RESULTS[result],
            lip_result=None if result is None else RESULTS[lip],
            voice_result=None if result is None else RESULTS[voice],
            feedback=V2Feedback(code=code, message=message),
            quality_flags=(warnings or []) + extra,
            visuals=visuals,
            engine="mediapipe_parselmouth_wav2vec2",
            processing_ms=round((time.perf_counter() - start) * 1000),
        )

    region = speech_region(feats, thresholds.segment, thresholds.audio.time_step_s * 1000)
    if region is None and not flags:
        flags = ["too_short"]
    hint = retry_hint(flags)
    if hint is not None or region is None:
        return response(
            (hint or "retry_short").upper(),
            "Rekam ulang dengan wajah dan suara yang jelas.",
            warnings=flags,
        )

    # Missing measurements are not evidence of incorrect pronunciation.
    metrics = {
        "a": (feats.lips.jaw_open,),
        "i": (feats.lips.lip_width_ratio, feats.lips.rounding),
        "u": (feats.lips.lip_width_ratio, feats.lips.rounding),
        "e": (feats.lips.jaw_open, feats.lips.lip_width_ratio),
        "o": (feats.lips.jaw_open, feats.lips.rounding),
    }[vowel]
    inside = (feats.lips.t_ms >= region[0]) & (feats.lips.t_ms < region[1])
    if not all(np.isfinite(metric[inside]).any() for metric in metrics):
        return response(
            "LIPS_UNAVAILABLE",
            "Gerak bibir belum dapat diukur. Rekam ulang sesuai contoh.",
            warnings=["lip_measurement_missing"],
        )
    anchors = calib.anchors(calibration, thresholds)
    point = vowel_median(feats.voice, *region, thresholds.audio.vowel_center_fraction)
    if point is None or not all(math.isfinite(value) for value in point):
        return response(
            "VOICE_UNAVAILABLE",
            "Suara vokal belum dapat diukur. Rekam ulang dengan suara yang jelas.",
            warnings=["voice_measurement_missing"],
        )

    acoustic = None
    if vowel in "aiu":
        lip_check, voice_check, _ = vowel_checks(
            vowel, feats.lips, feats.voice, region, anchors, thresholds
        )
        lip, acoustic = lip_check.status, voice_check.status
    else:
        # Existing e/o geometry thresholds; no invented e/o formant anchors.
        cfg = getattr(thresholds.rules.vowels, vowel)
        margin = thresholds.rules.yellow_margin

        def peak(series: np.ndarray, highest: bool = True) -> float:
            return span_peak(series, feats.lips.t_ms, *region, highest)

        jaw = middle_median(
            feats.lips.jaw_open, feats.lips.t_ms, *region, thresholds.audio.vowel_center_fraction
        )
        checks = [at_least(jaw, cfg.jaw_open_min, margin), at_most(jaw, cfg.jaw_open_max, margin)]
        checks.append(
            at_least(peak(feats.lips.lip_width_ratio), cfg.lip_width_ratio_min, margin)
            if vowel == "e"
            else at_least(peak(feats.lips.rounding), cfg.rounding_min, margin)
        )
        lip = worst(checks)

    if feats.samples is None:
        return response(
            "VOICE_UNAVAILABLE",
            "Suara belum terekam. Periksa mikrofon, lalu rekam ulang.",
            warnings=["audio_missing"],
        )
    if settings.tmp_dir is not None:
        settings.tmp_dir.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="cw_vowel_", dir=settings.tmp_dir) as folder:
        audio = Path(folder) / "audio.wav"
        sf.write(audio, feats.samples, feats.sample_rate, subtype="PCM_16")
        asr = _recognize(audio, thresholds.experiments.combined_asr_timeout_s)
    actual = normalize_text(asr.transcription).replace(" ", "")
    if not actual:
        return response(
            "RECORD_AGAIN",
            "Vokal belum terbaca. Ucapkan satu vokal sesuai contoh, lalu rekam ulang.",
            warnings=["empty_transcription"],
        )
    # A sustained "aaa" and separated "a a" still represent the same target vowel.
    matched = set(actual) == {vowel}
    asr_status: Status = "hijau" if matched else "merah"
    voice = asr_status if acoustic is None else worst([acoustic, asr_status])

    middle = sum(region) / 2
    face_indices = [index for index, frame in enumerate(feats.frames) if frame.has_face]
    contour = None
    if face_indices:
        index = min(face_indices, key=lambda index: abs(float(feats.lips.t_ms[index]) - middle))
        points = lip_contour(feats.frames[index], feats.image_size, thresholds.lips)
        if points is not None:
            contour = LipContour(
                points=[(round(float(x), 3), round(float(y), 3)) for x, y in points]
            )
    visuals = Visuals(
        vowel_point=FormantPoint(f1=round(point[0]), f2=round(point[1])),
        vowel_anchors=VowelAnchors(
            **{
                key: FormantPoint(f1=round(values[0]), f2=round(values[1]))
                for key, values in anchors.items()
            }
        ),
        lip_contour=contour,
        loudness=Loudness(
            t_ms=[round(float(value)) for value in feats.voice.t_ms],
            db=[round(float(value), 1) for value in feats.voice.intensity_db],
        ),
    )
    result = worst([lip, voice])
    code = "MATCHED" if result == "hijau" else "PRONUNCIATION_NOT_MATCHED"
    message = (
        "Ucapan sesuai target."
        if result == "hijau"
        else f"Coba ucapkan vokal {vowel.upper()} perlahan sesuai contoh."
    )
    return response(code, message, lip=lip, voice=voice, visuals=visuals)
