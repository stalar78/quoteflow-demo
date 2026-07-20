FROM python:3.14.3-alpine3.23 AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

COPY pyproject.toml ./
COPY app ./app

RUN python -m pip install --upgrade pip build wheel \
    && python -m build --wheel --outdir /wheels . \
    && python -m pip wheel --wheel-dir /wheels --no-deps /wheels/quoteflow_backend-0.0.0-py3-none-any.whl \
    && python -m pip wheel --wheel-dir /wheels \
        fastapi==0.139.2 \
        pydantic==2.13.4 \
        reportlab==5.0.0 \
        uvicorn==0.51.0

FROM python:3.14.3-alpine3.23 AS runtime

RUN apk upgrade --no-cache

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    QUOTEFLOW_CORS_ALLOW_ORIGINS=http://127.0.0.1:8080 \
    QUOTEFLOW_REQUEST_SIZE_LIMIT_BYTES=262144

RUN addgroup -S quoteflow \
    && adduser -S -G quoteflow -h /nonexistent -H quoteflow

WORKDIR /srv/quoteflow

COPY --from=builder /wheels /wheels

RUN python -m pip install --no-cache-dir --no-index --find-links=/wheels quoteflow-backend==0.0.0 \
    && rm -rf /wheels

USER quoteflow

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s CMD ["python", "-c", "import json, urllib.request; data=json.load(urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)); raise SystemExit(0 if data.get('status') == 'ok' else 1)"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
