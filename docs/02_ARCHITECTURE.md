# 02. Архитектура

## Текущая структура

```text
frontend/
  src/
    features/
      calculation/
        calculate.ts
        calculate.test.ts
        errors.ts
        types.ts
    App.tsx
    main.tsx
  package.json
  vite.config.ts
  tsconfig*.json

backend/
  app/
    api/routes/
      calculations.py
      health.py
    core/
      calculation.py
      errors.py
    schemas/
      calculation.py
    config.py
    main.py
  tests/
    test_api.py
    test_calculation.py
  pyproject.toml

fixtures/
  calculations/
    golden.json
    invalid.json

docs/
```

## Frontend boundary

Frontend реализован как React + TypeScript приложение на Vite. На текущем этапе он содержит минимальный placeholder и отдельное расчётное ядро.

Реализовано:

- строгие calculation types;
- runtime validation;
- парсинг decimal-string quantity;
- exact-integer arithmetic через `bigint`;
- стабильные domain errors;
- тесты на общих fixtures.

Следующий UI-слой будет отвечать за форму, локальную предварительную validation, быстрый расчёт, draft management и будущие export/API actions. Frontend не считается доверенной стороной.

## Backend boundary

Backend реализован как stateless FastAPI service.

Реализовано:

- строгие Pydantic schemas с запретом неизвестных полей;
- повторный расчёт через Python `int`;
- `GET /api/health`;
- `POST /api/v1/calculations/preview`;
- единый error envelope;
- request ID;
- CORS allowlist;
- фактический request-body limit;
- safe internal-error response.

Backend не хранит расчёты, черновики или документы.

## Browser storage boundary

Черновики ещё не реализованы. Для Этапа 3 зафиксирован ключ:

```text
quoteflow:drafts:v1
```

Черновики будут существовать только в браузере, поддерживать удаление и полную очистку, не синхронизироваться с backend и не позиционироваться как надёжное или конфиденциальное хранилище.

## Calculation consistency

TypeScript и Python реализации используют одну формулу, одинаковые лимиты и общие JSON fixtures. Денежные вычисления не опираются на floating point. Backend всегда пересчитывает totals самостоятельно.

## Поток данных

Текущий поток:

1. Strict input поступает в calculation core или preview endpoint.
2. Входные данные валидируются.
3. Quantity переводится в целый `quantityMilli`.
4. Totals вычисляются exact-integer алгоритмом.
5. Возвращается нормализованный `CalculationResult`.

Будущий UI-поток:

1. Пользователь редактирует draft.
2. UI хранит промежуточные строковые значения.
3. Draft нормализуется в strict input.
4. Frontend выполняет локальный расчёт.
5. Draft может сохраняться в `localStorage`.
6. На более позднем этапе strict input отправляется на backend preview или PDF.
