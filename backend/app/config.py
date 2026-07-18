from functools import lru_cache
from os import getenv


class Settings:
    def __init__(self) -> None:
        self.cors_allow_origins = self._parse_origins(
            getenv("QUOTEFLOW_CORS_ALLOW_ORIGINS", "http://localhost:5173")
        )
        self.request_size_limit_bytes = int(
            getenv("QUOTEFLOW_REQUEST_SIZE_LIMIT_BYTES", "262144")
        )

    @staticmethod
    def _parse_origins(raw_value: str) -> list[str]:
        return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
