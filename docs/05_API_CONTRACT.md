# 05. API Contract

Документ описывает планируемый backend contract. Endpoints в этом документе не являются реализованными на Этапе 1.

## Общие правила

- API versioning выполняется через `/api/v1`.
- Основной формат request/response: JSON.
- Validation errors должны иметь единый формат.
- Каждый backend response может содержать `requestId`, не связанный с персональными данными.
- JSON request size должен быть ограничен.
- Максимум `100` позиций в расчете.
- Backend не должен доверять итоговым суммам, присланным frontend.
- Backend всегда пересчитывает totals самостоятельно.
- Произвольные webhook URL отсутствуют.
- Внешняя отправка данных отсутствует.
- Authentication в MVP отсутствует, потому что пользовательские аккаунты не входят в scope.
- Ограничения public demo должны быть описаны отдельно в UI и документации.

## `GET /api/health`

Назначение: проверка доступности backend.

Планируемый response:

```json
{
  "status": "ok",
  "service": "quoteflow-api",
  "requestId": "demo-request-id"
}
```

## `POST /api/v1/calculations/preview`

Назначение:

- принять валидный расчет;
- повторно проверить входные данные;
- выполнить расчет;
- вернуть нормализованный breakdown.

Планируемый request body должен соответствовать `QuoteCalculationDraft` или отдельной normalized input model, если она будет выделена при реализации.

Планируемый successful response:

```json
{
  "requestId": "demo-request-id",
  "calculation": {
    "items": [],
    "subtotalMinor": 0,
    "overallDiscountMinor": 0,
    "amountAfterDiscountMinor": 0,
    "taxMinor": 0,
    "totalMinor": 0,
    "currency": "RUB",
    "calculationVersion": "v1"
  }
}
```

## `POST /api/v1/documents/pdf`

Назначение:

- принять валидный расчет;
- повторно выполнить расчет на backend;
- сформировать PDF;
- вернуть `application/pdf`.

PDF generation планируется на более позднем этапе. Перед созданием PDF backend должен пересчитать totals и использовать только валидированные данные.

## Validation error format

Планируемый формат:

```json
{
  "requestId": "demo-request-id",
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

## Drafts and export

Drafts не имеют backend endpoints. JSON import/export и CSV export выполняются на frontend.
