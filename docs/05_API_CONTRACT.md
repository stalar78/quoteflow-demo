# 05. API Contract

Три endpoint этого документа реализованы на Этапах 2 и 4.

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

Backend валидирует input и самостоятельно выполняет расчёт. Начиная с Этапа 5 frontend отправляет этот request только после явного нажатия `Проверить через API`; автоматическая отправка при редактировании отсутствует.

Frontend API client использует относительный URL, безопасный `X-Request-ID`, 10-second timeout, replacement/abort и stale-response protection. Успешный response проходит строгую runtime validation и сравнивается с локальным result без его автоматической замены.

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

Реализован на Этапе 4. Request body соответствует существующему строгому `QuoteCalculationInput`.

Дополнительное правило документа: `projectName.strip()` должен быть непустым. Backend не принимает totals, HTML, template, URL, filename или filesystem path и всегда повторно выполняет расчёт через Python calculation core.

Response `200`:

- body: бинарный PDF, начинающийся с `%PDF-`;
- `Content-Type: application/pdf`;
- `Content-Disposition: attachment; filename="quoteflow-proposal.pdf"`;
- `Cache-Control: no-store`;
- `X-Content-Type-Options: nosniff`;
- `X-Request-ID`: безопасный принятый или сгенерированный request ID.

PDF формируется in-memory, поддерживает кириллицу, длинный текст, до 100 позиций и многостраничные таблицы. Endpoint не сохраняет документ на сервере.

Начиная со Stage 7A frontend вызывает endpoint только по явному действию `Скачать PDF с сервера`. Client отправляет только strict `QuoteCalculationInput` на относительный same-origin URL, использует безопасный `X-Request-ID`, 15-second timeout и abort/replacement/stale-response protection. Response читается bounded stream до 2 MiB; client проверяет `application/pdf`, непустой body и `%PDF-` signature, использует фиксированное имя `quoteflow-proposal.pdf` и очищает временные browser resources.

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
- `429`: внешний production Nginx возвращает safe JSON envelope `RATE_LIMITED` при превышении per-IP API/PDF limits; application endpoints сами этот статус не генерируют.

## Frontend-only operations

Черновики, versioned JSON import/export, CSV export и browser print реализованы только во frontend и не имеют backend endpoints. Действие `Печать / сохранить PDF` вызывает только `window.print()` и не обращается к backend. Сетевые операции выполняются только явно: calculation preview и отдельное server-PDF download.
