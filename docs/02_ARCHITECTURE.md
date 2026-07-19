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
        PrintDocument.tsx
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
    PrintDocument.test.tsx
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
      documents.py
      health.py
    assets/fonts/
      DejaVuSans.ttf
      DejaVuSans-Bold.ttf
      LICENSE
    core/
      calculation.py
      errors.py
    schemas/
      calculation.py
    services/
      pdf_document.py
    config.py
    main.py
  tests/
    test_api.py
    test_calculation.py
    test_pdf_api.py
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
- keyboard/focus и базовый accessibility слой;
- print-friendly representation только для валидного расчёта с непустым названием проекта;
- вызов `window.print()` без сетевого обращения к backend.

Editable draft отделён от strict calculation input. Денежные и процентные строки преобразуются через разбор строки и `BigInt`; quantity нормализуется в каноническую decimal string. Frontend не считается доверенной стороной.

## Backend boundary

Backend реализован как stateless FastAPI service.

Реализовано:

- строгие Pydantic schemas с запретом неизвестных полей;
- повторный расчёт через Python `int`;
- `GET /api/health`;
- `POST /api/v1/calculations/preview`;
- `POST /api/v1/documents/pdf`;
- единый error envelope;
- request ID;
- CORS allowlist;
- фактический request-body limit;
- safe internal-error response.

Backend не хранит расчёты, черновики или документы. Stage 4 UI не вызывает backend endpoints: browser print и server PDF являются двумя отдельными, согласованными представлениями одного строгого расчёта.

## PDF generation boundary

PDF создаётся на backend через ReportLab Platypus полностью в памяти (`BytesIO`). Endpoint принимает только существующий строгий `QuoteCalculationInput`, требует непустой `projectName`, повторно вычисляет totals через `calculate_quote` и не принимает HTML, template, URL, filename или filesystem path.

Пользовательский текст экранируется перед передачей в markup-aware ReportLab objects. В PDF встраиваются DejaVu Sans и DejaVu Sans Bold с сохранённым license-файлом; package-data проверена сборкой и установкой wheel вне source checkout. Ответ имеет фиксированное имя `quoteflow-proposal.pdf`, `Cache-Control: no-store` и `X-Content-Type-Options: nosniff`.

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

## Поток данных Stage 3–4

1. Пользователь редактирует `EditableDraft`.
2. UI сохраняет промежуточные строковые значения.
3. После blur touched fields получают локальные ошибки.
4. Adapter нормализует валидные значения в `QuoteCalculationInput`.
5. Frontend выполняет локальный exact-integer расчёт.
6. UI показывает line totals и summary.
7. Draft может быть сохранён в versioned `localStorage` envelope.
8. Открытие нового, demo или сохранённого draft сбрасывает touched-state.
9. Для валидного расчёта с непустым названием UI отображает print representation и разрешает browser print.
10. Независимый PDF endpoint валидирует тот же input, повторно считает totals и возвращает in-memory PDF.

## Следующие архитектурные границы

Этап 5 добавит JSON/CSV import/export, backend preview integration и payload preview. Текущие PDF security boundaries и exact calculation semantics должны сохраняться.
