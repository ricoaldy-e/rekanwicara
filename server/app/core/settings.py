"""Server settings loaded from server/.env (SPEC §4)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_DIR = Path(__file__).resolve().parents[2]

ScorerMode = Literal["rules", "w2v", "hybrid"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVER_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = "0.0.0.0"
    port: int = 8000
    mock_mode: bool = False
    dataset_mode: bool = False
    debug: bool = False
    data_dir: Path = Path("../data")
    scorer_mode: ScorerMode = "rules"
    engine_version: str = "0.1.0"
    max_upload_mb: int = Field(default=15, gt=0)

    supabase_url: str = ""
    supabase_service_role_key: SecretStr = SecretStr("")

    @field_validator("data_dir")
    @classmethod
    def _resolve_data_dir(cls, value: Path) -> Path:
        # Relative paths are relative to server/, not to the current working directory.
        if not value.is_absolute():
            value = SERVER_DIR / value
        return value.resolve()

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
