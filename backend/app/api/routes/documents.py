from fastapi import APIRouter, Request
from fastapi.responses import Response

from app.core.calculation import calculate_quote
from app.core.errors import CalculationError
from app.schemas.calculation import QuoteCalculationInput
from app.services.pdf_document import render_quote_pdf

router = APIRouter(prefix="/api/v1/documents")


@router.post("/pdf")
def create_pdf(calculation_input: QuoteCalculationInput, request: Request) -> Response:
    if calculation_input.projectName.strip() == "":
        raise CalculationError(
            "INVALID_PROJECT_NAME",
            "Project name is required for PDF generation",
            "projectName",
        )

    result = calculate_quote(calculation_input)
    pdf_bytes = render_quote_pdf(calculation_input, result)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="quoteflow-proposal.pdf"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
