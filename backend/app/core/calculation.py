import re

from app.core.errors import CalculationError
from app.schemas.calculation import CalculationResult, QuoteCalculationInput

SCHEMA_VERSION = "1"
CURRENCY = "RUB"
CALCULATION_VERSION = "1"
MAX_ITEMS = 100
MAX_UNIT_PRICE_MINOR = 1_000_000_000_000
MAX_SAFE_MINOR = 9_000_000_000_000_000
QUANTITY_PATTERN = re.compile(r"^(0|[1-9]\d*)(\.\d{1,3})?$")


def calculate_quote(input_data: QuoteCalculationInput) -> CalculationResult:
    seen_ids: set[str] = set()
    line_results = []
    subtotal_minor = 0

    for index, item in enumerate(input_data.items):
        if item.id in seen_ids:
            raise CalculationError(
                "DUPLICATE_ITEM_ID", "Item IDs must be unique", f"items[{index}].id"
            )
        seen_ids.add(item.id)

        quantity_milli = parse_quantity(item.quantity, f"items[{index}].quantity")
        line_gross_minor = _assert_safe_minor(
            _round_half_up(quantity_milli * item.unitPriceMinor, 1000), "items"
        )
        line_discount_minor = _assert_safe_minor(
            _round_half_up(line_gross_minor * item.discountBasisPoints, 10000),
            "items",
        )
        line_total_minor = _assert_safe_minor(
            line_gross_minor - line_discount_minor, "items"
        )
        subtotal_minor = _assert_safe_minor(
            subtotal_minor + line_total_minor, "subtotalMinor"
        )

        line_results.append(
            {
                "itemId": item.id,
                "lineGrossMinor": line_gross_minor,
                "lineDiscountMinor": line_discount_minor,
                "lineTotalMinor": line_total_minor,
            }
        )

    overall_discount_minor = _assert_safe_minor(
        _round_half_up(subtotal_minor * input_data.overallDiscountBasisPoints, 10000),
        "overallDiscountMinor",
    )
    amount_after_discount_minor = _assert_safe_minor(
        subtotal_minor - overall_discount_minor, "amountAfterDiscountMinor"
    )
    tax_minor = _assert_safe_minor(
        _round_half_up(amount_after_discount_minor * input_data.taxBasisPoints, 10000),
        "taxMinor",
    )
    total_minor = _assert_safe_minor(
        amount_after_discount_minor + tax_minor, "totalMinor"
    )

    return CalculationResult(
        items=line_results,
        subtotalMinor=subtotal_minor,
        overallDiscountMinor=overall_discount_minor,
        amountAfterDiscountMinor=amount_after_discount_minor,
        taxMinor=tax_minor,
        totalMinor=total_minor,
        currency=CURRENCY,
        calculationVersion=CALCULATION_VERSION,
    )


def parse_quantity(quantity: str, path: str = "quantity") -> int:
    if not isinstance(quantity, str) or not QUANTITY_PATTERN.fullmatch(quantity):
        raise CalculationError(
            "INVALID_QUANTITY",
            "Quantity must be a canonical decimal string with up to three decimal places",
            path,
        )

    whole_part, _, fractional_part = quantity.partition(".")
    quantity_milli = int(whole_part) * 1000 + int(fractional_part.ljust(3, "0") or "0")

    if quantity_milli < 1 or quantity_milli > 1_000_000_000:
        raise CalculationError(
            "INVALID_QUANTITY",
            "Quantity must be between 0.001 and 1000000",
            path,
        )

    return quantity_milli


def normalize_error_code(path: str, error_type: str) -> str:
    if error_type == "extra_forbidden":
        return "UNEXPECTED_FIELD"
    if path == "schemaVersion":
        return "UNSUPPORTED_SCHEMA_VERSION"
    if path == "currency":
        return "INVALID_CURRENCY"
    if path == "items":
        return "INVALID_ITEMS"
    if path.endswith(".quantity"):
        return "INVALID_QUANTITY"
    if path.endswith(".unitPriceMinor"):
        return "INVALID_MONEY"
    if path.endswith("BasisPoints"):
        return "INVALID_BASIS_POINTS"
    if path.endswith(".id"):
        return "INVALID_ITEM_ID"
    if path.endswith(".name"):
        return "INVALID_ITEM_NAME"
    if path.endswith(".description"):
        return "INVALID_ITEM_DESCRIPTION"
    if path.endswith(".unit"):
        return "INVALID_UNIT"
    if path == "projectName":
        return "INVALID_PROJECT_NAME"
    if path.startswith("client"):
        return "INVALID_CLIENT"
    if path == "comment":
        return "INVALID_COMMENT"
    return "VALIDATION_ERROR"


def _round_half_up(numerator: int, denominator: int) -> int:
    return (numerator + denominator // 2) // denominator


def _assert_safe_minor(value: int, path: str) -> int:
    if value < 0 or value > MAX_SAFE_MINOR:
        raise CalculationError(
            "CALCULATION_LIMIT_EXCEEDED",
            "Calculation result exceeds the safe minor-unit limit",
            path,
        )
    return value
