from dataclasses import dataclass


@dataclass(frozen=True)
class CalculationError(Exception):
    code: str
    message: str
    path: str | None = None
