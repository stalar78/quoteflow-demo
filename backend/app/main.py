import re
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp

from app.api.routes.calculations import router as calculations_router
from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router
from app.config import get_settings
from app.core.calculation import normalize_error_code
from app.core.errors import CalculationError

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


class RequestSizeLimitMiddleware:
    def __init__(self, app: ASGIApp, limit_bytes: int) -> None:
        self.app = app
        self.limit_bytes = limit_bytes

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        content_length = headers.get(b"content-length")
        request_id = scope.get("state", {}).get("request_id") or uuid4().hex

        if self._exceeds_content_length(content_length):
            response = JSONResponse(
                status_code=413,
                content=_error_body(
                    request_id,
                    "REQUEST_TOO_LARGE",
                    "Request body exceeds the 256 KiB limit",
                    [],
                ),
                headers={"X-Request-ID": request_id},
            )
            await response(scope, receive, send)
            return

        buffered_messages = []
        received = 0
        more_body = True

        while more_body:
            message = await receive()
            buffered_messages.append(message)
            if message["type"] != "http.request":
                break

            received += len(message.get("body", b""))
            more_body = message.get("more_body", False)
            if received > self.limit_bytes:
                response = JSONResponse(
                    status_code=413,
                    content=_error_body(
                        request_id,
                        "REQUEST_TOO_LARGE",
                        "Request body exceeds the 256 KiB limit",
                        [],
                    ),
                    headers={"X-Request-ID": request_id},
                )
                await response(scope, receive, send)
                return

        replay_index = 0

        async def replay_receive():
            nonlocal replay_index
            if replay_index < len(buffered_messages):
                message = buffered_messages[replay_index]
                replay_index += 1
                return message
            return await receive()

        await self.app(scope, replay_receive, send)

    def _exceeds_content_length(self, raw_value: bytes | None) -> bool:
        if raw_value is None:
            return False
        try:
            return int(raw_value) > self.limit_bytes
        except ValueError:
            return False


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        request_id = _safe_request_id_from_headers(headers)
        scope.setdefault("state", {})["request_id"] = request_id

        async def send_with_request_id(message):
            if message["type"] == "http.response.start":
                message.setdefault("headers", [])
                if not any(name.lower() == b"x-request-id" for name, _ in message["headers"]):
                    message["headers"].append((b"x-request-id", request_id.encode("ascii")))
            await send(message)

        await self.app(scope, receive, send_with_request_id)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="QuoteFlow API", version="0.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Request-ID"],
    )
    app.add_middleware(RequestSizeLimitMiddleware, limit_bytes=settings.request_size_limit_bytes)
    app.add_middleware(RequestIdMiddleware)

    app.include_router(health_router)
    app.include_router(calculations_router)
    app.include_router(documents_router)

    @app.exception_handler(CalculationError)
    async def calculation_error_handler(
        request: Request, exc: CalculationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_error_body(
                request.state.request_id,
                exc.code,
                exc.message,
                [{"path": exc.path or "", "code": exc.code, "message": exc.message}],
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        if any(error.get("type") == "json_invalid" for error in exc.errors()):
            return _malformed_json_response(request)

        fields = []
        for error in exc.errors():
            path = _format_validation_path(error.get("loc", ()))
            fields.append(
                {
                    "path": path,
                    "code": normalize_error_code(path, error.get("type", "")),
                    "message": "Input validation failed",
                }
            )
        return JSONResponse(
            status_code=422,
            content=_error_body(
                request.state.request_id,
                "VALIDATION_ERROR",
                "Input validation failed",
                fields,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, _exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_error_body(
                request.state.request_id,
                "INTERNAL_ERROR",
                "Internal server error",
                [],
            ),
        )

    return app


def _safe_request_id_from_headers(headers: dict[bytes, bytes]) -> str:
    raw_request_id = headers.get(b"x-request-id")
    if raw_request_id:
        try:
            request_id = raw_request_id.decode("ascii")
        except UnicodeDecodeError:
            return uuid4().hex
        if REQUEST_ID_PATTERN.fullmatch(request_id):
            return request_id
    return uuid4().hex


def _error_body(
    request_id: str, code: str, message: str, fields: list[dict[str, str]]
) -> dict[str, object]:
    return {
        "requestId": request_id,
        "error": {
            "code": code,
            "message": message,
            "fields": fields,
        },
    }


def _format_validation_path(loc: tuple[object, ...]) -> str:
    parts = [part for part in loc if part != "body"]
    path = ""
    for part in parts:
        if isinstance(part, int):
            path += f"[{part}]"
        else:
            path = f"{path}.{part}" if path else str(part)
    return path


def _malformed_json_response(request: Request) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content=_error_body(
            request.state.request_id,
            "MALFORMED_JSON",
            "Malformed JSON request body",
            [],
        ),
    )


app = create_app()
