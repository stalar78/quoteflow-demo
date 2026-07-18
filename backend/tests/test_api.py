import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "calculations"
client = TestClient(app, raise_server_exceptions=False)


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


def test_health_response_includes_request_id() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "quoteflow-api"
    assert body["requestId"]
    assert response.headers["X-Request-ID"] == body["requestId"]


def test_valid_preview_response_matches_fixture() -> None:
    fixture = _load_fixture("golden.json")["cases"][0]

    response = client.post("/api/v1/calculations/preview", json=fixture["input"])

    assert response.status_code == 200
    body = response.json()
    assert body["requestId"]
    assert response.headers["X-Request-ID"] == body["requestId"]
    assert body["calculation"] == fixture["expected"]


def test_validation_error_response() -> None:
    fixture = next(
        case for case in _load_fixture("invalid.json")["cases"] if case["name"] == "zero_quantity"
    )

    response = client.post("/api/v1/calculations/preview", json=fixture["input"])

    assert response.status_code == 422
    body = response.json()
    assert body["requestId"]
    assert response.headers["X-Request-ID"] == body["requestId"]
    assert body["error"]["fields"][0]["code"] == "INVALID_QUANTITY"


def test_malformed_json_response() -> None:
    response = client.post(
        "/api/v1/calculations/preview",
        content="{",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "MALFORMED_JSON"
    assert response.headers["X-Request-ID"] == body["requestId"]


def test_oversized_request_response() -> None:
    response = client.post(
        "/api/v1/calculations/preview",
        content=b"{" + b" " * 262145 + b"}",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 413
    body = response.json()
    assert body["error"]["code"] == "REQUEST_TOO_LARGE"
    assert response.headers["X-Request-ID"] == body["requestId"]


def test_oversized_request_without_content_length_response() -> None:
    response = _call_asgi(
        method="POST",
        path="/api/v1/calculations/preview",
        body_chunks=[b"{" + b" " * 262145 + b"}"],
        headers=[(b"content-type", b"application/json")],
    )

    assert response["status"] == 413
    body = json.loads(response["body"].decode("utf-8"))
    assert body["error"]["code"] == "REQUEST_TOO_LARGE"
    assert response["headers"][b"x-request-id"].decode("ascii") == body["requestId"]


def test_oversized_request_in_multiple_body_chunks_response() -> None:
    response = _call_asgi(
        method="POST",
        path="/api/v1/calculations/preview",
        body_chunks=[b"{" + b" " * 140000, b" " * 130000 + b"}"],
        headers=[(b"content-type", b"application/json")],
    )

    assert response["status"] == 413
    body = json.loads(response["body"].decode("utf-8"))
    assert body["error"]["code"] == "REQUEST_TOO_LARGE"


def test_request_below_limit_without_content_length_reaches_app() -> None:
    fixture = _load_fixture("golden.json")["cases"][0]
    response = _call_asgi(
        method="POST",
        path="/api/v1/calculations/preview",
        body_chunks=[json.dumps(fixture["input"]).encode("utf-8")],
        headers=[(b"content-type", b"application/json")],
    )

    assert response["status"] == 200
    body = json.loads(response["body"].decode("utf-8"))
    assert body["calculation"] == fixture["expected"]


def test_malformed_content_length_does_not_500() -> None:
    fixture = _load_fixture("golden.json")["cases"][0]
    response = _call_asgi(
        method="POST",
        path="/api/v1/calculations/preview",
        body_chunks=[json.dumps(fixture["input"]).encode("utf-8")],
        headers=[(b"content-type", b"application/json"), (b"content-length", b"not-a-number")],
    )

    assert response["status"] == 200
    body = json.loads(response["body"].decode("utf-8"))
    assert body["requestId"]


def test_unexpected_fields_response() -> None:
    fixture = next(
        case
        for case in _load_fixture("invalid.json")["cases"]
        if case["name"] == "unexpected_input_fields"
    )

    response = client.post("/api/v1/calculations/preview", json=fixture["input"])

    assert response.status_code == 422
    body = response.json()
    field_codes = {field["code"] for field in body["error"]["fields"]}
    assert "UNEXPECTED_FIELD" in field_codes


def test_calculation_limit_overflow_response() -> None:
    fixture = next(
        case
        for case in _load_fixture("invalid.json")["cases"]
        if case["name"] == "calculation_limit_overflow"
    )

    response = client.post("/api/v1/calculations/preview", json=fixture["input"])

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "CALCULATION_LIMIT_EXCEEDED"


def test_request_id_header_can_be_supplied() -> None:
    fixture = _load_fixture("golden.json")["cases"][0]

    response = client.post(
        "/api/v1/calculations/preview",
        json=fixture["input"],
        headers={"X-Request-ID": "test-request-id"},
    )

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "test-request-id"
    assert response.json()["requestId"] == "test-request-id"


@pytest.mark.parametrize(
    ("header_value", "should_reflect"),
    [
        ("safe.request_ID-1", True),
        (None, False),
        ("bad request id", False),
        ("a" * 65, False),
    ],
)
def test_request_id_validation(header_value: str | None, should_reflect: bool) -> None:
    headers = {"X-Request-ID": header_value} if header_value is not None else {}

    response = client.get("/api/health", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert response.headers["X-Request-ID"] == body["requestId"]
    if should_reflect:
        assert body["requestId"] == header_value
    else:
        assert body["requestId"] != header_value
        assert len(body["requestId"]) == 32
        assert body["requestId"].isascii()


def test_non_ascii_raw_request_id_is_replaced() -> None:
    response = _call_asgi(
        method="GET",
        path="/api/health",
        body_chunks=[b""],
        headers=[(b"x-request-id", "идентификатор".encode("utf-8"))],
    )

    assert response["status"] == 200
    body = json.loads(response["body"].decode("utf-8"))
    assert response["headers"][b"x-request-id"].decode("ascii") == body["requestId"]
    assert len(body["requestId"]) == 32
    assert body["requestId"].isascii()


@pytest.mark.parametrize("case", _load_fixture("invalid.json")["cases"], ids=lambda case: case["name"])
def test_invalid_fixtures_return_expected_error_codes(case: dict) -> None:
    response = client.post("/api/v1/calculations/preview", json=_expand_input(case))

    assert response.status_code == 422
    body = response.json()
    assert response.headers["X-Request-ID"] == body["requestId"]
    returned_codes = {body["error"]["code"]} | {
        field["code"] for field in body["error"]["fields"]
    }
    assert case["errorCode"] in returned_codes
    assert "Traceback" not in response.text
    assert "ValidationError" not in response.text
    assert "input_value" not in response.text


def _call_asgi(
    *,
    method: str,
    path: str,
    body_chunks: list[bytes],
    headers: list[tuple[bytes, bytes]],
) -> dict[str, Any]:
    import anyio

    async def run_call() -> dict[str, Any]:
        messages = [
            {
                "type": "http.request",
                "body": chunk,
                "more_body": index < len(body_chunks) - 1,
            }
            for index, chunk in enumerate(body_chunks)
        ]
        sent_messages: list[dict[str, Any]] = []

        async def receive() -> dict[str, Any]:
            if messages:
                return messages.pop(0)
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message: dict[str, Any]) -> None:
            sent_messages.append(message)

        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method,
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("ascii"),
            "query_string": b"",
            "headers": headers,
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
            "state": {},
        }

        await app(scope, receive, send)
        start = next(message for message in sent_messages if message["type"] == "http.response.start")
        body = b"".join(
            message.get("body", b"")
            for message in sent_messages
            if message["type"] == "http.response.body"
        )
        return {
            "status": start["status"],
            "headers": dict(start["headers"]),
            "body": body,
        }

    return anyio.run(run_call)
