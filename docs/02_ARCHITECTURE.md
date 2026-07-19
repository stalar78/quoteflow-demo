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
      exchange/
        DataExchangePanel.tsx
        apiClient.ts
        apiClient.test.ts
        dataExchange.ts
        dataExchange.test.ts
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
- вызов `window.print()` без сетевого обращения к backend;
- versioned JSON import/export и CSV export;
- read-only preview строгого payload;
- явный calculation preview request с timeout, abort и stale-response protection;
- отдельное сравнение backend result с локальным результатом без его замены.

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

Backend не хранит расчёты, черновики или документы. Stage 5 UI явно вызывает только `/api/v1/calculations/preview`; browser print и server PDF остаются отдельными представлениями, а PDF endpoint из UI не вызывается.

## PDF generation boundary

PDF создаётся на backend через ReportLab Platypus полностью в памяти (`BytesIO`). Endpoint принимает только существующий строгий `QuoteCalculationInput`, требует непустой `projectName`, повторно вычисляет totals через `calculate_quote` и не принимает HTML, template, URL, filename или filesystem path.

Пользовательский текст экранируется перед передачей в markup-aware ReportLab objects. В PDF встраиваются DejaVu Sans и DejaVu Sans Bold с сохранённым license-файлом; package-data проверена сборкой и установкой wheel вне source checkout. Ответ имеет фиксированное имя `quoteflow-proposal.pdf`, `Cache-Control: no-store` и `X-Content-Type-Options: nosniff`.

## Data exchange boundary

JSON export содержит только versioned envelope `exportVersion: "1"`, `type: "quoteflow-calculation"` и строгий `QuoteCalculationInput`. Draft metadata, timestamps, request IDs и totals не экспортируются. Import ограничен 256 KiB, обрабатывается как недоверенный input, отвергает неизвестные поля и несовместимые версии и заменяет текущий draft только после полной strict validation.

CSV создаётся локально с UTF-8 BOM, CRLF, фиксированным порядком колонок и exact decimal strings. Пользовательские текстовые cells защищаются от spreadsheet formula injection. Downloads используют временный object URL с гарантированным удалением anchor и deferred revoke.

Backend preview выполняется только по явному действию пользователя. API client отправляет только `QuoteCalculationInput`, проверяет response runtime structure, ограничивает request ID и денежные значения, поддерживает 10-second timeout, replacement/abort и игнорирует obsolete responses. Backend result показывается отдельно и сравнивается со всеми полями локального результата.

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

## Поток данных Stage 3–5

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
11. Валидный strict input может быть экспортирован в JSON/CSV или показан как payload preview.
12. JSON import полностью проверяется до преобразования в новый `EditableDraft`.
13. Явный API preview request отправляет strict input, а runtime-validated result сравнивается с локальным расчётом.

## Следующие архитектурные границы

Этап 6 добавит Docker Compose, сквозной local launch, dependency audit и итоговый responsive/accessibility/security QA. Текущие local-first, exact calculation, import/export, API и PDF boundaries должны сохраняться.
