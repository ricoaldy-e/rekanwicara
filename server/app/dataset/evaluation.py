"""Phase A6: threshold tuning and evaluation (SPEC §10.6, §11) on the processed team dataset.

Clips are re-scored from the stored series (data/processed/*.npz, A4): no MediaPipe run needed.
The truth is the human label check (two annotators per clip, SPEC §10.5), combined with the intended
error: an intended error that both annotators judged "sesuai" with correct lips was not performed.

Honesty rules: LOSO folds tune on two speakers and report on the third; the vowel anchors of a fold
come from its tuning speakers only. Every percentage comes with its clip count.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field, replace
from pathlib import Path

import numpy as np

from app.content.loader import Content
from app.core.thresholds import Thresholds
from app.dataset.labels import all_labels, cohens_kappa, read_metadata
from app.dataset.report import checkers
from app.pipeline.audio import AudioSeries, vowel_median
from app.pipeline.calibration import Anchors
from app.pipeline.calibration import anchors as default_anchors
from app.pipeline.lips import LipSeries
from app.pipeline.rules import consonant_checks, score_item
from app.pipeline.segment import find_closures, has_consonant, segment_units

BLOCK_G = ("bad_face", "bad_noise")  # SPEC §10.2 block G: deliberately bad recordings
VISIBLE_ERRORS = ("mama_as_papa", "u_flat_lips", "a_narrow", "mama_no_closure")
METRICS = ("closure", "voicing", "vowel", "word")
METRIC_NAMES = {
    "closure": "deteksi bibir rapat",
    "voicing": "senyap vs bersuara saat rapat",
    "vowel": "vokal a/i/u",
    "word": "status kata (hijau vs bukan)",
}
TARGETS = {"closure": 0.90, "voicing": 0.80, "vowel": 0.85, "word": 0.80}  # SPEC §11

# (metric it is tuned on, dotted path in thresholds.yaml, candidate values). Small grids on purpose:
# 2 tuning speakers hold ~50 clips, so anything finer would fit noise.
GRID: tuple[tuple[str, str, tuple[float, ...]], ...] = (
    ("closure", "lips.closed_gap_ratio", (0.05, 0.06, 0.07, 0.08, 0.10, 0.12)),
    ("voicing", "rules.consonants.p.voiced_ratio_max", (0.3, 0.4, 0.5, 0.6)),
    ("voicing", "rules.consonants.b.voiced_ratio_min", (0.3, 0.4, 0.5, 0.6)),
    ("voicing", "rules.consonants.m.voiced_ratio_min", (0.3, 0.4, 0.5, 0.6)),
    ("vowel", "rules.vowels.a.jaw_open_min", (0.20, 0.25, 0.30, 0.35, 0.40, 0.45)),
    ("vowel", "rules.vowels.i.lip_width_ratio_min", (1.00, 1.05, 1.10, 1.15)),
    ("vowel", "rules.vowels.u.rounding_min", (0.20, 0.25, 0.35, 0.45)),
    ("vowel", "rules.vowels.a.f1_margin_hz", (0.0, 50.0, 100.0, 150.0)),
    ("vowel", "rules.vowels.i.f2_margin_hz", (100.0, 200.0, 300.0)),
    ("vowel", "rules.vowels.u.f2_margin_hz", (100.0, 200.0, 300.0)),
)
# SPEC §6.7 gives explicit yellow limits for p and b: keep their 0.1 distance to the green limit.
_LINKED = {
    "rules.consonants.p.voiced_ratio_max": ("rules.consonants.p.yellow_voiced_ratio_max", 0.1),
    "rules.consonants.b.voiced_ratio_min": ("rules.consonants.b.yellow_voiced_ratio_min", -0.1),
}


# ---------- data ----------


@dataclass
class Clip:
    clip_id: str
    speaker: str
    item_id: str
    error: str
    level: int
    units: list[str]
    retry: bool
    region: tuple[float, float] | None
    total_ms: int
    lips: LipSeries
    voice: AudioSeries
    humans: list[dict[str, str]] = field(default_factory=list)


def load_clips(data_dir: Path, content: Content) -> list[Clip]:
    """Every recorded clip that has processed outputs, with its human labels."""
    labels = all_labels(data_dir)
    processed = data_dir / "processed"
    clips = []
    for row in read_metadata(data_dir / "raw"):
        cid, item = row["clip_id"], content.items_by_id.get(row["item_id"])
        json_path, npz_path = processed / f"{cid}.json", processed / f"{cid}.npz"
        if item is None or not (json_path.is_file() and npz_path.is_file()):
            continue
        summary = json.loads(json_path.read_text(encoding="utf-8"))
        with np.load(npz_path) as s:
            lips = LipSeries(
                t_ms=s["lip_t_ms"],
                jaw_open=s["lip_jaw_open"],
                lip_gap_ratio=s["lip_gap_ratio"],
                lip_width_ratio=s["lip_width_ratio"],
                rounding=s["lip_rounding"],
                mouth_close=np.full(s["lip_t_ms"].shape, np.nan),
                closed=s["lip_closed"],
            )
            voice = AudioSeries(
                t_ms=s["voice_t_ms"],
                intensity_db=s["voice_intensity_db"],
                f0_hz=s["voice_f0_hz"],
                voiced=s["voice_voiced"],
                f1_hz=s["voice_f1_hz"],
                f2_hz=s["voice_f2_hz"],
            )
        region = summary.get("speech_region_ms")
        clips.append(
            Clip(
                clip_id=cid,
                speaker=row["speaker_id"],
                item_id=item.item_id,
                error=row["intended_error"],
                level=item.level,
                units=list(item.units),
                retry=summary["status"] == "retry",
                region=None if region is None else (float(region[0]), float(region[1])),
                total_ms=int(summary["timings_ms"]["total_ms"]),
                lips=lips,
                voice=voice,
                humans=[labels[a][cid] for a in checkers(row) if cid in labels.get(a, {})],
            )
        )
    return clips


def expand(params: dict[str, float]) -> dict[str, float]:
    """``params`` plus the yellow limits linked to them."""
    out = dict(params)
    for path, value in params.items():
        if path in _LINKED:
            linked, delta = _LINKED[path]
            out[linked] = round(min(1.0, max(0.0, value + delta)), 3)
    return out


def with_params(t: Thresholds, params: dict[str, float]) -> Thresholds:
    """A copy of ``t`` with dotted-path values replaced (linked yellow limits follow)."""
    data = t.model_dump()
    for path, value in expand(params).items():
        node = data
        *parents, leaf = path.split(".")
        for key in parents:
            node = node[key]
        node[leaf] = value
    return Thresholds.model_validate(data)


def get_param(t: Thresholds, path: str) -> float:
    node: object = t
    for key in path.split("."):
        node = getattr(node, key)
    return float(node)  # type: ignore[arg-type]


# ---------- truth ----------


def human_verdict(clip: Clip) -> str | None:
    """'ok'/'wrong' when both annotators agree on "sesuai materi", 'split' if not, else None."""
    if len(clip.humans) < 2:
        return None
    votes = {h["matches_request"] for h in clip.humans}
    return "split" if len(votes) > 1 else ("ok" if votes == {"1"} else "wrong")


def effective_error(clip: Clip) -> str:
    """The intended error, unless both annotators saw a correct clip (error not performed)."""
    if (
        clip.error in VISIBLE_ERRORS
        and human_verdict(clip) == "ok"
        and all(h["lips_wrong"] == "0" for h in clip.humans)
    ):
        return "none"
    return clip.error


def _usable_for_units(clip: Clip) -> bool:
    """Unit-level truth needs a scored, non-block-G clip whose aspect we know. A "correct" clip both
    annotators rejected is wrong in an unknown way, so it says nothing about a single unit."""
    if clip.retry or clip.region is None or clip.error in BLOCK_G:
        return False
    return not (effective_error(clip) == "none" and human_verdict(clip) == "wrong")


# ---------- samples and metrics ----------


@dataclass(frozen=True)
class Sample:
    clip_id: str
    truth: bool
    machine: bool
    detail: str


def _closed(lips: LipSeries, t: Thresholds) -> LipSeries:
    # lips.closed was stored with the thresholds of processing time; recompute it for the candidate.
    gap = np.nan_to_num(lips.lip_gap_ratio, nan=np.inf)
    return replace(lips, closed=gap < t.lips.closed_gap_ratio)


def consonant_samples(clip: Clip, t: Thresholds) -> tuple[list[Sample], list[Sample]]:
    """(closure detection, voicing during the closure) samples for the clip's consonant units."""
    if clip.level not in (2, 3) or not _usable_for_units(clip):
        return [], []
    eff = effective_error(clip)
    lips = _closed(clip.lips, t)
    assert clip.region is not None
    found = find_closures(lips, clip.voice, clip.region, t.segment, 1000 / t.media.fps)
    spans = segment_units(clip.units, found, clip.voice, clip.region, t.segment)
    closure, voicing = [], []
    for span in spans:
        if not has_consonant(span.target):
            continue
        truth_closed = eff != "mama_no_closure"
        closure.append(Sample(clip.clip_id, truth_closed, span.closure is not None, span.target))
        if truth_closed and span.closure is not None:
            _, check = consonant_checks(span, t)
            voicing.append(
                Sample(
                    clip.clip_id,
                    eff != "mama_as_papa",  # mama_as_papa: both closures held silent (SPEC §10.3)
                    check.status == "hijau",
                    f"{span.target} voiced_ratio={span.closure.voiced_ratio:.2f}",
                )
            )
    return closure, voicing


def vowel_samples(clip: Clip, t: Thresholds, anchors: Anchors) -> list[Sample]:
    """Level 1 a/i/u clips: the unit status is hijau exactly when the vowel was made correctly."""
    if clip.level != 1 or clip.units[0] not in ("a", "i", "u") or not _usable_for_units(clip):
        return []
    assert clip.region is not None
    unit = score_item(
        clip.item_id, clip.units, _closed(clip.lips, t), clip.voice, clip.region, anchors, t
    ).units[0]
    return [
        Sample(
            clip.clip_id,
            effective_error(clip) == "none",
            unit.status == "hijau",
            f"{unit.target}: bibir {unit.bibir}, suara {unit.suara}",
        )
    ]


def word_samples(clip: Clip, t: Thresholds, anchors: Anchors) -> list[Sample]:
    """Level 3 words: overall hijau vs the two annotators (clips they disagree on are left out)."""
    verdict = human_verdict(clip)
    if clip.level != 3 or clip.error in BLOCK_G or verdict not in ("ok", "wrong"):
        return []
    if clip.retry or clip.region is None:
        return [Sample(clip.clip_id, verdict == "ok", False, "retry")]
    result = score_item(
        clip.item_id, clip.units, _closed(clip.lips, t), clip.voice, clip.region, anchors, t
    )
    statuses = [u.status for u in result.units]
    machine = all(s == "hijau" for s in statuses)
    return [Sample(clip.clip_id, verdict == "ok", machine, "/".join(statuses))]


def samples(clips: list[Clip], t: Thresholds, anchors: Anchors, metric: str) -> list[Sample]:
    out: list[Sample] = []
    for clip in clips:
        if metric in ("closure", "voicing"):
            closure, voicing = consonant_samples(clip, t)
            out += closure if metric == "closure" else voicing
        elif metric == "vowel":
            out += vowel_samples(clip, t, anchors)
        else:
            out += word_samples(clip, t, anchors)
    return out


@dataclass(frozen=True)
class Score:
    n: int
    agree: int
    kappa: float | None
    balanced: float  # mean recall of the two classes; robust when one class is rare
    tp: int  # truth True,  machine True
    fn: int  # truth True,  machine False
    fp: int  # truth False, machine True
    tn: int  # truth False, machine False

    @property
    def percent(self) -> float | None:
        return None if self.n == 0 else self.agree / self.n

    def text(self) -> str:
        return "0/0" if self.n == 0 else f"{self.agree}/{self.n} = {self.agree / self.n:.0%}"


def score(items: list[Sample]) -> Score:
    tp = sum(s.truth and s.machine for s in items)
    fn = sum(s.truth and not s.machine for s in items)
    fp = sum(not s.truth and s.machine for s in items)
    tn = sum(not s.truth and not s.machine for s in items)
    recalls = [x / (x + y) for x, y in ((tp, fn), (tn, fp)) if x + y > 0]
    return Score(
        n=len(items),
        agree=tp + tn,
        kappa=cohens_kappa([s.truth for s in items], [s.machine for s in items]),
        balanced=float(np.mean(recalls)) if recalls else 0.0,
        tp=tp,
        fn=fn,
        fp=fp,
        tn=tn,
    )


# ---------- anchors and tuning ----------


def anchors_from(clips: list[Clip], t: Thresholds) -> Anchors:
    """Vowel anchors (median F1/F2) of the correct Level 1 a/i/u clips; §6.3 defaults otherwise."""
    out = dict(default_anchors(None, t))
    for vowel in ("a", "i", "u"):
        points = [
            vowel_median(c.voice, c.region[0], c.region[1], t.audio.vowel_center_fraction)
            for c in clips
            if c.item_id == f"l1_{vowel}" and c.region is not None and not c.retry
            and effective_error(c) == "none" and human_verdict(c) != "wrong"
        ]  # fmt: skip
        points = [p for p in points if p is not None]
        if points:
            out[vowel] = (
                float(np.median([p[0] for p in points])),
                float(np.median([p[1] for p in points])),
            )
    return out


def tune(clips: list[Clip], base: Thresholds, anchors: Anchors) -> dict[str, float]:
    """One pass of coordinate search over GRID, maximising the balanced accuracy of the parameter's
    own metric. Ties go to the word status (A3/A6: isolated vowels are opened wider than vowels in
    words, so the vowel metric alone cannot choose between equally good values), then to the value
    closest to the current one."""
    params: dict[str, float] = {}
    for metric, path, grid in GRID:
        current = get_param(base, path)

        def objective(
            value: float, metric: str = metric, path: str = path, current: float = current
        ) -> tuple[float, float, float]:
            t = with_params(base, {**params, path: value})
            own = score(samples(clips, t, anchors, metric)).balanced
            word = score(samples(clips, t, anchors, "word")).balanced
            return own, word, -abs(value - current)

        params[path] = max(grid, key=objective)
    return params


# ---------- LOSO ----------


def evaluate(clips: list[Clip], t: Thresholds, anchors: Anchors) -> dict[str, Score]:
    return {m: score(samples(clips, t, anchors, m)) for m in METRICS}


def k1_checks(clips: list[Clip]) -> dict[str, tuple[int, int]]:
    """(caught, total): block G clips sent back for a retry, acceptable clips wrongly rejected."""
    bad_face = [c for c in clips if c.error == "bad_face"]
    bad_noise = [c for c in clips if c.error == "bad_noise"]
    fine = [
        c
        for c in clips
        if c.error not in BLOCK_G
        and len(c.humans) == 2
        and all(h["quality_ok"] == "1" for h in c.humans)
    ]
    return {
        "bad_face_retry": (sum(c.retry for c in bad_face), len(bad_face)),
        "bad_noise_retry": (sum(c.retry for c in bad_noise), len(bad_noise)),
        "good_rejected": (sum(c.retry for c in fine), len(fine)),
    }


def latency(clips: list[Clip]) -> dict[str, float]:
    ms = np.array([c.total_ms for c in clips], dtype=float)
    return {"p50": float(np.percentile(ms, 50)), "p90": float(np.percentile(ms, 90)), "n": len(ms)}


@dataclass
class FoldResult:
    test_speaker: str
    params: dict[str, float]
    anchors: Anchors
    before: dict[str, Score]  # thresholds.yaml as it is, same fold anchors
    after: dict[str, Score]  # tuned on the two other speakers


def run_loso(clips: list[Clip], base: Thresholds) -> list[FoldResult]:
    folds = []
    for speaker in sorted({c.speaker for c in clips}):
        tune_set = [c for c in clips if c.speaker != speaker]
        test_set = [c for c in clips if c.speaker == speaker]
        anchors = anchors_from(tune_set, base)
        params = tune(tune_set, base, anchors)
        folds.append(
            FoldResult(
                test_speaker=speaker,
                params=params,
                anchors=anchors,
                before=evaluate(test_set, base, anchors),
                after=evaluate(test_set, with_params(base, params), anchors),
            )
        )
    return folds


def pooled(folds: list[FoldResult], attr: str) -> dict[str, tuple[int, int]]:
    """(agree, n) summed over the folds: every clip is tested exactly once."""
    return {
        m: (
            sum(getattr(f, attr)[m].agree for f in folds),
            sum(getattr(f, attr)[m].n for f in folds),
        )
        for m in METRICS
    }


# ---------- thresholds.yaml ----------

_LINE = re.compile(
    r"^(?P<indent>\s*)(?P<key>[A-Za-z0-9_]+):(?P<sp>\s*)(?P<value>[^#\n]*?)(?P<comment>\s*#.*)?$"
)


def update_yaml(text: str, updates: dict[str, float], note: str) -> str:
    """Replaces scalar values at dotted paths, keeping the old value in the line's comment."""
    out, stack = [], []  # stack of (indent, key) for open mappings
    for line in text.splitlines():
        m = _LINE.match(line)
        if not m:
            out.append(line)
            continue
        indent = len(m["indent"])
        while stack and stack[-1][0] >= indent:
            stack.pop()
        path = ".".join([k for _, k in stack] + [m["key"]])
        value = m["value"].strip()
        if not value:
            stack.append((indent, m["key"]))
        elif path in updates and float(value) != updates[path]:
            old_comment = (m["comment"] or "").strip().lstrip("#").strip()
            comment = f"# {note}, sebelumnya {value}" + (f"; {old_comment}" if old_comment else "")
            line = f"{m['indent']}{m['key']}: {updates[path]:g}  {comment}"
        out.append(line)
    return "\n".join(out) + ("\n" if text.endswith("\n") else "")
