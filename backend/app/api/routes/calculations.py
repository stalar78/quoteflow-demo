from fastapi import APIRouter, Request

from app.core.calculation import calculate_quote
from app.schemas.calculation import QuoteCalculationInput

router = APIRouter(prefix="/api/v1/calculations")


@router.post("/preview")
def preview_calculation(
    calculation_input: QuoteCalculationInput, request: Request
) -> dict[str, object]:
    return {
        "requestId": request.state.request_id,
        "calculation": calculate_quote(calculation_input).model_dump(),
    }
