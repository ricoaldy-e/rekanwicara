"""Pick ONE hint_id (SPEC §6.9): quality flag first, then the first merah unit, then the first
kuning unit (lips before voice inside a unit is decided by the unit's reason_code), else ok_good."""

from __future__ import annotations

from collections.abc import Sequence

from app.pipeline.quality import FLAG_ORDER
from app.pipeline.rules import UnitScore

RETRY_HINTS = {
    "no_face": "retry_no_face",
    "face_off_frame": "retry_off_frame",
    "too_quiet": "retry_quiet",
    "too_noisy": "retry_noisy",
    "clipping": "retry_clipping",
    "too_short": "retry_short",
}
VOWEL_LIP_HINTS = {"a": "a_open", "i": "i_spread", "u": "u_round"}
FIXED_HINTS = {
    "l0_duration_short": "l0_duration_short",
    "l0_loudness_flat": "l0_loudness_flat",
    "vowel_open_low": "a_open",
    "vowel_spread_low": "i_spread",
    "vowel_round_low": "u_round",
    "closure_missing": "closure_missing",
    "closure_voicing_unexpected": "p_silent",
    "hum_open": "closure_missing",
    "hum_short": "m_voicing",
}


def retry_hint(flags: Sequence[str]) -> str | None:
    """The hint for the first quality flag in §6.2 order; None when no flag causes a retry."""
    return next((RETRY_HINTS[f] for f in FLAG_ORDER if f in flags), None)


def unit_hint(unit: UnitScore) -> str | None:
    code = unit.reason_code
    if code is None:
        return None
    if code == "vowel_acoustic_mismatch":  # §6.9: the lip hint of the target vowel
        return VOWEL_LIP_HINTS[unit.target[-1]]
    if code == "closure_voicing_expected":
        return "m_voicing" if unit.target[0] == "m" else "b_voicing"
    return FIXED_HINTS[code]


def pick_hint(units: Sequence[UnitScore]) -> str:
    for status in ("merah", "kuning"):
        for unit in units:
            if unit.status == status and (hint := unit_hint(unit)):
                return hint
    return "ok_good"
