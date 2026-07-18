import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.calculation import calculate_quote
from app.core.calculation import normalize_error_code
from app.core.errors import CalculationError
from app.schemas.calculation import QuoteCalculationInput

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "calculations"


def _load_fixture(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))


def _expand_input(case: dict) -> dict:
    input_data = dict(case["input"])
    expand_to = input_data.pop("fixtureExpandItemsTo", None)
    if expand_to is None:
        return input_data

    template = input_data["items"][0]
    input_data["items"] = [
        {**template, "id": f"item-{index + 1:03d}"} for index in range(expand_to)
    ]
    return input_data


@pytest.mark.parametrize("case", _load_fixture("golden.json")["cases"], ids=lambda case: case["name"])
def test_calculation_matches_golden_fixture(case: dict) -> None:
    input_model = QuoteCalculationInput.model_validate(case["input"])

    assert calculate_quote(input_model).model_dump() == case["expected"]


@pytest.mark.parametrize("case", _load_fixture("invalid.json")["cases"], ids=lambda case: case["name"])
def test_calculation_rejects_invalid_fixture(case: dict) -> None:
    with pytest.raises((CalculationError, ValidationError)) as exc_info:
        input_model = QuoteCalculationInput.model_validate(_expand_input(case))
        calculate_quote(input_model)

    if isinstance(exc_info.value, CalculationError):
        assert exc_info.value.code == case["errorCode"]
    else:
        field_codes = {
            normalize_error_code(
                _format_validation_path(error.get("loc", ())),
                error.get("type", ""),
            )
            for error in exc_info.value.errors()
        }
        assert case["errorCode"] in field_codes


def test_calculation_preserves_input_order() -> None:
    fixture = next(
        case for case in _load_fixture("golden.json")["cases"] if case["name"] == "several_items"
    )
    input_model = QuoteCalculationInput.model_validate(fixture["input"])

    result = calculate_quote(input_model)

    assert [item.itemId for item in result.items] == ["item-a", "item-b", "item-c"]


def _format_validation_path(loc: tuple[object, ...]) -> str:
    path = ""
    for part in loc:
        if isinstance(part, int):
            path += f"[{part}]"
        else:
            path = f"{path}.{part}" if path else str(part)
    return path
