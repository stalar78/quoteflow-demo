# 05. API Contract

Документ описывает планируемый backend contract. Endpoints ещё не реализованы.

## Общие правила

- API versioning: `/api/v1`.
- JSON request/response использует UTF-8.
- Максимальный request body: `256 KiB`.
- Максимум 100 позиций.
- Неизвестные поля отклоняются.
- Backend не принимает totals во входной модели и всегда пересчитывает их самостоятельно.
- Все ответы получают технический `requestId`; он также возвращается в `X-Request-ID`.
- Request body и пользовательский текст не логируются.
- Authentication, drafts endpoints, внешняя отправка и произвольные webhook URL в MVP отсутствуют.

## GET /api/health

Response `200`:

```json
{
  "status": "ok",
  "service": "quoteflow-api",
  "requestId": "generated-id"
}
```

## POST /api/v1/calculations/preview

Request body — непосредственно `QuoteCalculationInput` из `04_DATA_MODEL.md`.

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

Request body — `QuoteCalculationInput`, дополнительно удовлетворяющий document validation: непустой `projectName`.

Backend повторно валидирует данные и выполняет расчёт. Response `200`:

- `Content-Type: application/pdf`;
- `Content-Disposition` с безопасным ASCII filename;
- `X-Request-ID`;
- PDF body.

Backend не принимает HTML template или filename от пользователя.

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
        "message": "Quantity must be a positive decimal string"
      }
    ]
  }
}
```

Планируемые статусы:

- `400`: malformed JSON;
- `413`: request too large;
- `422`: schema or calculation validation error;
- `429`: rate limit exceeded в public deployment;
- `500`: безопасная внутренняя ошибка без stack trace.

## Frontend-only operations

Черновики, JSON import/export и CSV export не имеют backend endpoints.
