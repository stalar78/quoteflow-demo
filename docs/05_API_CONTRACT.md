# 05. API Contract

Два endpoint этого документа реализованы на Этапе 2. PDF endpoint остаётся будущим.

## Общие правила

- API prefix: `/api/v1`.
- JSON request/response: UTF-8.
- Максимальный request body: `256 KiB`, проверяется по фактически полученным ASGI chunks.
- Максимум 100 позиций.
- Неизвестные поля отклоняются.
- Backend не принимает totals и всегда пересчитывает их.
- Ответы получают безопасный `requestId` в body и `X-Request-ID`.
- Допустимый client request ID: `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`; остальные заменяются UUID hex.
- Request body и пользовательский текст не логируются приложением.
- CORS origins задаются через `QUOTEFLOW_CORS_ALLOW_ORIGINS`.
- Authentication, draft endpoints и внешняя отправка отсутствуют.

## GET /api/health

Реализован.

Response `200`:

```json
{
  "status": "ok",
  "service": "quoteflow-api",
  "requestId": "generated-id"
}
```

## POST /api/v1/calculations/preview

Реализован. Request body соответствует `QuoteCalculationInput`.

Backend валидирует input и самостоятельно выполняет расчёт.

Response `200`:

```json
{
  "requestId": "generated-id",
  "calculation": {
    "items": [
      {
        "itemId": "item-1",
        "lineGrossMinor": 100000,
        "lineDiscountMinor": 0,
        "lineTotalMinor": 100000
      }
    ],
    "subtotalMinor": 100000,
    "overallDiscountMinor": 0,
    "amountAfterDiscountMinor": 100000,
    "taxMinor": 0,
    "totalMinor": 100000,
    "currency": "RUB",
    "calculationVersion": "1"
  }
}
```

## POST /api/v1/documents/pdf

Не реализован и не зарегистрирован как рабочий endpoint. Он будет проектироваться после отдельного PDF technical spike.

## Error envelope

```json
{
  "requestId": "generated-id",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "fields": [
      {
        "path": "items[0].quantity",
        "code": "INVALID_QUANTITY",
        "message": "Input validation failed"
      }
    ]
  }
}
```

Статусы:

- `400`: malformed JSON;
- `413`: request too large;
- `422`: schema или calculation error;
- `500`: безопасная внутренняя ошибка без stack trace;
- `429`: зарезервирован для будущего public rate limiting.

## Frontend-only operations

Черновики, JSON import/export и CSV export не имеют backend endpoints.
