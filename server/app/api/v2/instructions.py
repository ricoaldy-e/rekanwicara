"""Editable suggestions from a configured Chat Completions-compatible LLM; never writes data."""

import json
import re
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter

from app.api.deps import SettingsDep, ThresholdsDep
from app.api.errors import ApiError
from app.api.schemas import InstructionRequest, InstructionResponse
from app.api.v2.store import AccountDep
from app.content.loader import CONTENT_DIR, FORBIDDEN_WORDS

router = APIRouter(prefix="/v2", tags=["instructions-v2"])
# docs/AI_INSTRUCTION_BRIEF.md: steps one per line (part A), built from the letter bank and the
# syllable rules of part B. Kept as a content file so the team can edit it without code changes.
SYSTEM_PROMPT = (CONTENT_DIR / "instruction_prompt.txt").read_text("utf-8")
BLOCKED_WORDS = (
    *FORBIDDEN_WORDS,
    "terapi",
    "sembuh",
    "dengarkan",
    "mendengarkan",
    "dengar suara",
    "terdengar",
    "tunarungu",
    "penderita",
)
_MARKER = re.compile(r"^\s*(?:[-•*]+|\d+[.)]|\(\d+\))\s*")
_SENTENCE_END = re.compile(r"(?<=[.?!])\s+")


def tidy_steps(raw: str, max_steps: int, max_step_chars: int, max_total_chars: int) -> str:
    """Brief part A server checks: one step per line, no numbering, at most `max_steps` lines,
    each cut at `max_step_chars` and the whole at `max_total_chars`. Empty string = unusable."""
    lines = [_MARKER.sub("", line).strip() for line in raw.splitlines()]
    lines = [line for line in lines if line]
    if len(lines) == 1 and len(lines[0]) > max_step_chars:
        lines = [part.strip() for part in _SENTENCE_END.split(lines[0]) if part.strip()]
    if len(lines) > max_steps:
        lines = [*lines[: max_steps - 1], " ".join(lines[max_steps - 1 :])]
    kept: list[str] = []
    for line in lines:
        line = line[:max_step_chars].rstrip()
        if len("\n".join([*kept, line])) > max_total_chars:
            break
        kept.append(line)
    return "\n".join(kept)


@router.post("/instructions/generate", response_model=InstructionResponse)
def generate(
    request: InstructionRequest,
    account: AccountDep,
    settings: SettingsDep,
    thresholds: ThresholdsDep,
) -> InstructionResponse:
    target = request.text.strip()
    parent = request.parent_word.strip() if request.parent_word is not None else None
    if not target or (parent is not None and not parent):
        raise ApiError(422, "INVALID_INPUT", "Teks target dan konteks tidak boleh kosong.")
    url = urlsplit(settings.llm_api_url)
    key = settings.llm_api_key.get_secret_value()
    if (
        url.scheme != "https"
        or not url.netloc
        or url.username
        or url.query
        or url.fragment
        or not key
        or not settings.llm_model
    ):
        raise ApiError(503, "AI_UNAVAILABLE", "Generator instruksi belum dikonfigurasi di server.")
    cfg = thresholds.generation
    try:
        with httpx.Client(timeout=cfg.timeout_s, follow_redirects=False, trust_env=False) as client:
            response = client.post(
                settings.llm_api_url,
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": json.dumps(
                                {"type": request.type, "text": target, "parent_word": parent},
                                ensure_ascii=False,
                            ),
                        },
                    ],
                    "response_format": {"type": "json_object"},
                    "max_completion_tokens": cfg.max_tokens,
                },
            )
        if response.status_code == 429:
            raise ApiError(
                429,
                "GENERATION_RATE_LIMITED",
                "Batas generator tercapai. Tunggu sebentar atau tulis instruksi sendiri.",
            )
        if response.status_code != 200:
            raise ApiError(
                503,
                "AI_UNAVAILABLE",
                "Generator belum dapat menjawab. Instruksi tetap dapat ditulis sendiri.",
            )
        body = response.json()
        choice = body["choices"][0]
        if choice.get("finish_reason") != "stop":
            raise ValueError("Incomplete generation")
        result = InstructionResponse.model_validate_json(choice["message"]["content"])
        raw = result.instruction.strip()
        if len(raw) > cfg.max_instruction_chars or any(
            word in raw.casefold() for word in BLOCKED_WORDS
        ):
            raise ValueError("Unusable instruction")
        value = tidy_steps(raw, cfg.max_steps, cfg.max_step_chars, cfg.max_total_chars)
        if not value:
            raise ValueError("Unusable instruction")
        return InstructionResponse(instruction=value)
    except httpx.TimeoutException as exc:
        raise ApiError(
            504,
            "INFERENCE_TIMEOUT",
            "Generator terlalu lama menjawab. Teks manual tetap dapat digunakan.",
        ) from exc
    except (httpx.HTTPError, ValueError, KeyError, TypeError, IndexError) as exc:
        raise ApiError(
            503,
            "AI_UNAVAILABLE",
            "Saran instruksi belum dapat digunakan. Silakan tulis sendiri atau coba lagi.",
        ) from exc
