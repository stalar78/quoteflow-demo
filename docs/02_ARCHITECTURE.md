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
      documents/
        pdfClient.ts
        pdfClient.test.ts
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
  .dockerignore
  Dockerfile
  nginx.conf
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
  .dockerignore
  Dockerfile
  pyproject.toml

fixtures/
  calculations/
    golden.json
    invalid.json

compose.yaml
compose.production.yaml
.env.production.example
LICENSE
deploy/
  nginx/
    quoteflow.http.conf
    quoteflow.https.conf
.github/workflows/ci.yml
docs/
  10_DEPLOYMENT_BEGET.md
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
- отдельное сравнение backend result с локальным результатом без его замены;
- независимый explicit server-PDF download с bounded streaming, response validation и lifecycle protection.

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

Backend не хранит расчёты, черновики или документы. UI явно вызывает `/api/v1/calculations/preview` и, отдельным действием, `/api/v1/documents/pdf`. Browser print и server PDF остаются независимыми представлениями.

## PDF generation boundary

PDF создаётся на backend через ReportLab Platypus полностью в памяти (`BytesIO`). Endpoint принимает только существующий строгий `QuoteCalculationInput`, требует непустой `projectName`, повторно вычисляет totals через `calculate_quote` и не принимает HTML, template, URL, filename или filesystem path.

Пользовательский текст экранируется перед передачей в markup-aware ReportLab objects. В PDF встраиваются DejaVu Sans и DejaVu Sans Bold с сохранённым license-файлом; package-data проверена сборкой и установкой wheel вне source checkout. Ответ имеет фиксированное имя `quoteflow-proposal.pdf`, `Cache-Control: no-store` и `X-Content-Type-Options: nosniff`.

## Data exchange boundary

JSON export содержит только versioned envelope `exportVersion: "1"`, `type: "quoteflow-calculation"` и строгий `QuoteCalculationInput`. Draft metadata, timestamps, request IDs и totals не экспортируются. Import ограничен 256 KiB, обрабатывается как недоверенный input, отвергает неизвестные поля и несовместимые версии и заменяет текущий draft только после полной strict validation.

CSV создаётся локально с UTF-8 BOM, CRLF, фиксированным порядком колонок и exact decimal strings. Пользовательские текстовые cells защищаются от spreadsheet formula injection. Downloads используют временный object URL с гарантированным удалением anchor и deferred revoke.

Backend preview выполняется только по явному действию пользователя. API client отправляет только `QuoteCalculationInput`, проверяет response runtime structure, ограничивает request ID и денежные значения, поддерживает 10-second timeout, replacement/abort и игнорирует obsolete responses. Backend result показывается отдельно и сравнивается со всеми полями локального результата.

Server PDF client также запускается только явно, отправляет strict input на относительный same-origin endpoint, использует безопасный request ID и 15-second timeout. Response читается bounded stream до 2 MiB, проверяется по MIME и `%PDF-` signature и сохраняется под фиксированным именем. Edit/reset/import/open/replacement/unmount синхронно инвалидируют obsolete request; временные anchor и object URL очищаются.

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

## Local integration boundary

Stage 6 добавляет локальный production-like контур из двух Compose services:

- frontend собирается в Node builder stage и обслуживается unprivileged Nginx на `127.0.0.1:8080`;
- backend собирается как wheel и запускается непривилегированным пользователем во внутренней Compose network без host publish;
- Nginx проксирует `/api/` в `backend:8000`, обслуживает SPA fallback, не подменяет отсутствующие assets и применяет отдельные cache policies для hashed assets и HTML;
- оба service имеют healthcheck; frontend стартует после healthy backend;
- runtime images не содержат bind mounts, project volumes, Docker socket, test dependencies или build wheel directory;
- Compose не использует privileged mode, host networking или `container_name`.

Контур предназначен только для локального integration/QA. Он не является production deployment.

## Production deployment boundary

Stage 7B подготавливает отдельный `compose.production.yaml` для существующего Beget VPS:

- frontend публикуется только на `127.0.0.1:8081`;
- backend имеет только `expose: 8000` во внутренней Docker bridge network и не публикуется на host;
- browser использует same-origin `/api/`, а container Nginx маршрутизирует запросы в `backend:8000`;
- системный Nginx VPS является единственной public ingress boundary, завершает TLS и проксирует в loopback frontend;
- production CORS фиксируется exact origin `https://quoteflow.stalarvision.ru`;
- system Nginx задаёт per-IP limits отдельно для общего API и PDF endpoint;
- images маркируются reviewed Git SHA для управляемого rollback;
- application остаётся stateless и не использует volumes.

Production Compose добавляет read-only filesystems, tmpfs для runtime paths, `no-new-privileges`, drop всех capabilities, PID limits и log rotation. Фактический deployment запрещён до проверки ресурсов VPS, полного pre-deployment audit и отдельного разрешения владельца. Инструкции: `docs/10_DEPLOYMENT_BEGET.md`.

## CI boundary

Stage 7A добавляет GitHub Actions workflow для push и pull request в `main`. Workflow использует `permissions: contents: read`, не сохраняет checkout credentials, закрепляет official actions полными commit SHA и задаёт finite timeouts. Отдельные jobs выполняют frontend tests/build/lint, backend tests/import/wheel asset checks и Docker Compose config/build. Workflow не публикует images, packages, releases и не выполняет deployment.

## Calculation consistency

TypeScript и Python реализации используют одну формулу, одинаковые лимиты и общие JSON fixtures. Денежные вычисления и UI-formatting не опираются на floating point. Backend всегда пересчитывает totals самостоятельно.

## Поток данных Stage 3–7A

1. Пользователь редактирует `EditableDraft`.
2. UI сохраняет промежуточные строковые значения.
3. После blur touched fields получают локальные ошибки.
4. Adapter нормализует валидные значения в `QuoteCalculationInput`.
5. Frontend выполняет локальный exact-integer расчёт.
6. UI показывает line totals и summary.
7. Draft может быть сохранён в versioned `localStorage` envelope.
8. Открытие нового, demo или сохранённого draft сбрасывает touched-state.
9. Для валидного расчёта с непустым названием UI отображает print representation и разрешает browser print.
10. Browser print остаётся локальным; отдельное явное действие отправляет тот же strict input в PDF endpoint, который повторно считает totals и возвращает in-memory PDF.
11. PDF client bounded-stream читает до 2 MiB, проверяет MIME и `%PDF-`, затем скачивает файл с фиксированным именем; obsolete responses не меняют UI и не инициируют download.
12. Валидный strict input может быть экспортирован в JSON/CSV или показан как payload preview.
13. JSON import полностью проверяется до преобразования в новый `EditableDraft`.
14. Явный API preview request отправляет strict input, а runtime-validated result сравнивается с локальным расчётом.
15. В Docker-контуре браузер обращается только к loopback Nginx, а `/api/` маршрутизируется во внутренний backend service.
16. Healthchecks подтверждают готовность обоих services; остановка Compose удаляет локальные containers/network без пользовательских volumes.

## Следующие архитектурные границы

Stage 7A release-readiness завершён. Репозиторий был публичным с момента создания, MIT License согласована и добавлена. Stage 7B deployment-конфигурация для Beget VPS находится на review; live deployment ещё не выполнялся. До отдельного разрешения сохраняются current local-first, exact calculation, import/export, API, PDF, CI и container boundaries.
