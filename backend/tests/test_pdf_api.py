import json
from pathlib import Path
from tempfile import gettempdir

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from app.main import app
from app.services import pdf_document
from app.services.pdf_document import format_money, render_quote_pdf

client = TestClient(app, raise_server_exceptions=False)


def valid_input(**overrides) -> dict:
    data = {
        "schemaVersion": "1",
        "projectName": "Демонстрационный расчёт",
        "client": {
            "displayName": "Условный клиент",
            "contactNote": "Только демо-данные",
        },
        "items": [
            {
                "id": "item-1",
                "name": "Анализ требований",
                "description": "Синтетическое описание",
                "quantity": "2",
                "unit": "час",
                "unitPriceMinor": 150000,
                "discountBasisPoints": 0,
            }
        ],
        "overallDiscountBasisPoints": 1000,
        "taxBasisPoints": 2000,
        "comment": "Комментарий для демо-документа",
        "currency": "RUB",
    }
    data.update(overrides)
    return data


def read_pdf(response_content: bytes) -> PdfReader:
    from io import BytesIO

    return PdfReader(BytesIO(response_content))


def extracted_text(response_content: bytes) -> str:
    reader = read_pdf(response_content)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def compact_pdf_text(value: str) -> str:
    return value.replace("\n", " ").replace(" ", "").replace("\xa0", "")


def test_pdf_endpoint_success_headers_and_signature() -> None:
    response = client.post("/api/v1/documents/pdf", json=valid_input())

    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-")
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'attachment; filename="quoteflow-proposal.pdf"'
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-request-id"]
    assert b"requestId" not in response.content


def test_pdf_request_id_preservation_and_replacement() -> None:
    response = client.post(
        "/api/v1/documents/pdf",
        json=valid_input(),
        headers={"X-Request-ID": "pdf-request-1"},
    )
    assert response.status_code == 200
    assert response.headers["x-request-id"] == "pdf-request-1"

    replaced = client.post(
        "/api/v1/documents/pdf",
        json=valid_input(),
        headers={"X-Request-ID": "bad request id"},
    )
    assert replaced.status_code == 200
    assert replaced.headers["x-request-id"] != "bad request id"
    assert len(replaced.headers["x-request-id"]) == 32


def test_pdf_rejects_blank_project_name() -> None:
    response = client.post("/api/v1/documents/pdf", json=valid_input(projectName="  "))

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "INVALID_PROJECT_NAME"
    assert body["error"]["fields"][0]["path"] == "projectName"


def test_pdf_malformed_json_response() -> None:
    response = client.post(
        "/api/v1/documents/pdf",
        content="{",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "MALFORMED_JSON"


def test_pdf_schema_error_for_unexpected_fields() -> None:
    payload = valid_input()
    payload["filename"] = "../quote.pdf"

    response = client.post("/api/v1/documents/pdf", json=payload)

    assert response.status_code == 422
    codes = {field["code"] for field in response.json()["error"]["fields"]}
    assert "UNEXPECTED_FIELD" in codes


def test_pdf_calculation_limit_error() -> None:
    payload = valid_input(
        items=[
            {
                "id": f"item-{index}",
                "name": "Крупная позиция",
                "description": "",
                "quantity": "1000000",
                "unit": "услуга",
                "unitPriceMinor": 1_000_000_000_000,
                "discountBasisPoints": 0,
            }
            for index in range(10)
        ]
    )

    response = client.post("/api/v1/documents/pdf", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "CALCULATION_LIMIT_EXCEEDED"


def test_pdf_extracts_cyrillic_text() -> None:
    response = client.post("/api/v1/documents/pdf", json=valid_input())

    text = extracted_text(response.content)
    assert "Демонстрационный расчёт" in text
    assert "Условный клиент" in text
    assert "Анализ требований" in text


def test_pdf_treats_markup_like_text() -> None:
    payload = valid_input(
        projectName='Проект <img src=x> & "кавычки"',
        comment="Комментарий <b>не жирный</b> & безопасный",
        items=[
            {
                **valid_input()["items"][0],
                "name": "Позиция <b>как текст</b>",
                "description": "Описание с <tag> & символами",
            }
        ],
    )

    response = client.post("/api/v1/documents/pdf", json=payload)

    assert response.status_code == 200
    text = extracted_text(response.content)
    assert "Проект <img src=x> &" in text
    assert "Позиция <b>как текст</b>" in text
    assert "Описание с <tag> & символами" in text


def test_pdf_does_not_access_external_resources(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_urlopen(*_args, **_kwargs):
        raise AssertionError("external access attempted")

    monkeypatch.setattr("urllib.request.urlopen", fail_urlopen)

    response = client.post("/api/v1/documents/pdf", json=valid_input())

    assert response.status_code == 200


def test_pdf_contains_backend_recalculated_totals() -> None:
    response = client.post("/api/v1/documents/pdf", json=valid_input())

    text = compact_pdf_text(extracted_text(response.content))
    assert "3000,00₽" in text
    assert "300,00₽" in text
    assert "2700,00₽" in text
    assert "540,00₽" in text
    assert "3240,00₽" in text


def test_exact_high_range_money_formatting() -> None:
    assert format_money(0) == "0,00 ₽"
    assert format_money(1) == "0,01 ₽"
    assert format_money(1_200_050) == "12 000,50 ₽"
    assert format_money(8_999_999_999_999_998) == "89 999 999 999 999,98 ₽"
    assert format_money(8_999_999_999_999_999) == "89 999 999 999 999,99 ₽"


def test_pdf_handles_long_strings() -> None:
    long_text = "ДлиннаяСтрокаБезПробелов" * 30
    payload = valid_input(projectName=long_text[:120], comment=long_text)
    payload["items"][0]["name"] = long_text[:160]
    payload["items"][0]["description"] = long_text

    response = client.post("/api/v1/documents/pdf", json=payload)

    assert response.status_code == 200
    assert len(read_pdf(response.content).pages) >= 1


def test_pdf_supports_100_item_multipage_document() -> None:
    payload = valid_input(
        items=[
            {
                "id": f"item-{index:03d}",
                "name": f"Синтетическая позиция {index}",
                "description": "Длинное описание для проверки переноса строк " * 3,
                "quantity": "1",
                "unit": "шт.",
                "unitPriceMinor": 10000,
                "discountBasisPoints": 0,
            }
            for index in range(1, 101)
        ]
    )

    response = client.post("/api/v1/documents/pdf", json=payload)

    assert response.status_code == 200
    reader = read_pdf(response.content)
    assert len(reader.pages) > 1
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert "Синтетическая позиция 100" in text


def test_pdf_generation_leaves_no_temp_pdf_files() -> None:
    temp_dir = Path(gettempdir())
    before = {path for path in temp_dir.glob("*.pdf") if path.is_file()}

    response = client.post("/api/v1/documents/pdf", json=valid_input())

    after = {path for path in temp_dir.glob("*.pdf") if path.is_file()}
    assert response.status_code == 200
    assert after == before


def test_pdf_service_returns_valid_pdf_bytes() -> None:
    from app.core.calculation import calculate_quote
    from app.schemas.calculation import QuoteCalculationInput

    input_model = QuoteCalculationInput.model_validate(valid_input())
    pdf_bytes = render_quote_pdf(input_model, calculate_quote(input_model))

    assert pdf_bytes.startswith(b"%PDF-")
    assert len(read_pdf(pdf_bytes).pages) == 1
