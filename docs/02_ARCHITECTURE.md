# 02. Архитектура

## Текущая структура

```text
frontend/
  src/
    components/
      AppHeader.tsx
      DemoNotice.tsx
      Field.tsx
    features/
      calculation/
        CalculationForm.tsx
        ItemsEditor.tsx
        SummaryPanel.tsx
        calculate.ts
        calculate.test.ts
        editableTypes.ts
        errors.ts
        inputAdapters.ts
        types.ts
      drafts/
        DraftsPanel.tsx
        draftStorage.ts
    App.test.tsx
    App.tsx
    main.tsx
    styles.css
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

Frontend реализован как responsive React + TypeScript приложение на Vite с Tailwind CSS.

UI-слой отвечает за:

- editable draft state со строковыми промежуточными значениями;
- project/client fields и динамические позиции;
- touched-field validation без преждевременного показа ошибок;
- нормализацию UI-значений в строгий `QuoteCalculationInput`;
- точный локальный расчёт через существующий calculation core;
- точное форматирование minor units без floating point;
- line totals и итоговую панель;
- локальное управление черновиками;
- demo/privacy предупреждения;
- keyboard/focus и базовый accessibility слой.

Editable draft отделён от strict calculation input. Денежные и процентные строки преобразуются через разбор строки и `BigInt`; quantity нормализуется в каноническую decimal string. Frontend не считается доверенной стороной.

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

Backend не хранит расчёты, черновики или документы. Stage 3 UI пока не вызывает backend endpoint.

## Browser storage boundary

Черновики реализованы через единственный versioned key:

```text
quoteflow:drafts:v1
```

Storage layer:

- безопасно разбирает JSON;
- проверяет версию envelope;
- фильтрует структурно некорректные drafts;
- перехватывает ошибки чтения и записи;
- сохраняет и обновляет draft по ID;
- сохраняет `createdAt` и обновляет `updatedAt`;
- удаляет один draft;
- очищает только ключ QuoteFlow и не вызывает `localStorage.clear()`.

Черновики существуют только в текущем браузере, не синхронизируются с backend и не являются надёжным или конфиденциальным хранилищем.

## Calculation consistency

TypeScript и Python реализации используют одну формулу, одинаковые лимиты и общие JSON fixtures. Денежные вычисления и UI-formatting не опираются на floating point. Backend всегда пересчитывает totals самостоятельно.

## Поток данных Stage 3

1. Пользователь редактирует `EditableDraft`.
2. UI сохраняет промежуточные строковые значения.
3. После blur touched fields получают локальные ошибки.
4. Adapter нормализует валидные значения в `QuoteCalculationInput`.
5. Frontend выполняет локальный exact-integer расчёт.
6. UI показывает line totals и summary.
7. Draft может быть сохранён в versioned `localStorage` envelope.
8. Открытие нового, demo или сохранённого draft сбрасывает touched-state.

## Следующие архитектурные границы

Этап 4 добавит print-friendly representation и PDF generation. PDF не должен принимать произвольный HTML, template или filesystem path. Backend integration, JSON/CSV import/export и payload preview остаются задачами последующих этапов.
