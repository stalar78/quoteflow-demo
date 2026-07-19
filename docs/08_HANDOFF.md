# 08. Handoff

## Текущий статус

Этап 6 завершён и проверен. Implementation commit:

`63833f88f97da1406a2b8ae0341e90da806aa5e2`

Добавлен и сквозным образом проверен локальный Docker Compose-контур с Nginx frontend и внутренним FastAPI backend. Это production-like local integration environment, а не deployment. Репозиторий остаётся приватным; лицензия и публикация не согласованы. PDF endpoint из UI по-прежнему не вызывается.

## Проверенное состояние

- frontend: 135 tests, production build и type-check проходят;
- backend: 78 tests и application import/startup check проходят;
- TypeScript calculation core использует `bigint`, Python — `int`;
- UI adapters преобразуют ruble/percent strings точной integer arithmetic;
- денежное форматирование не делит minor units через floating point;
- общие fixtures подтверждают одинаковую расчётную семантику frontend/backend;
- responsive UI проверен на desktop, tablet и mobile screenshots;
- untouched fields остаются нейтральными, ошибки появляются после blur и очищаются после исправления;
- drafts сохраняются только в `quoteflow:drafts:v1`;
- storage parsing/version/write failures обрабатываются безопасно;
- удаление и очистка не затрагивают другие localStorage keys;
- request body limit проверяет фактические ASGI chunks;
- request ID валидируется;
- PDF endpoint повторно считает totals и не принимает arbitrary HTML/template/URL/filename/path;
- PDF создаётся in-memory через ReportLab и возвращается с `no-store`, `nosniff` и фиксированным filename;
- пользовательский текст экранируется перед markup-aware ReportLab objects;
- DejaVu Sans assets и license включены в wheel через явную package-data configuration;
- установленный wheel вне source checkout успешно генерирует PDF с извлекаемой кириллицей;
- browser print доступен только для валидного расчёта с непустым названием и не вызывает backend;
- длинный PDF и print-table поддерживают многостраничность и повторение заголовка;
- JSON export не содержит draft metadata, timestamps, request IDs или totals;
- JSON import ограничен 256 KiB, требует versioned envelope и сохраняет текущий draft при ошибке;
- imported money/percent values преобразуются без floating point;
- CSV использует UTF-8 BOM, CRLF, exact decimal strings и formula-injection protection;
- payload preview отображает только strict input и ничего не отправляет автоматически;
- API preview выполняется только по explicit click и отправляет только `QuoteCalculationInput`;
- API response проходит exact runtime validation и сравнивается с локальным result;
- timeout, abort-on-edit, request replacement и stale-response protection покрыты тестами;
- DataExchangePanel расположен full-width вне sticky sidebar;
- Compose публикует только frontend на `127.0.0.1:8080`, backend остаётся внутри private network;
- frontend/backend runtime users непривилегированные, mounts/volumes/privileged mode отсутствуют;
- Nginx `/api/` proxy, SPA fallback, missing-asset 404, cache policy и baseline security headers проверены;
- оба services прошли healthchecks без restart, а полный build/up/smoke/down cycle завершён;
- calculation preview, safe/unsafe request IDs, malformed JSON, strict unknown-field rejection и backend 413 проверены через reverse proxy;
- server PDF через proxy сохранил MIME/headers, кириллицу, totals и in-memory boundary;
- frontend runtime не содержит Node/npm, backend runtime не содержит test dependencies или `/wheels`;
- browser QA пройден на шести viewports без horizontal scroll; axe scan сообщил 0 violations;
- npm и pip audits не выявили известных уязвимостей на момент Stage 6;
- staging и patch прошли whitespace review;
- реальных данных и секретов не добавлено;
- working tree владельца после push был чистым.

## Следующий этап

Этап 7: отдельное решение о публикации и deployment.

До начала Stage 7 необходимо получить явное решение владельца по каждому внешнему изменению. Возможные задачи после такого решения:

- выбрать, остаётся ли репозиторий приватным;
- согласовать лицензию до добавления license-файла проекта;
- повторить security, dependency, base-image, Git-history и synthetic-data audit непосредственно перед публикацией;
- выбрать production platform и определить TLS, secrets, CORS, rate limiting, logs/monitoring и rollback;
- сформировать deployment brief с точными границами и критериями приёмки.

Без отдельного согласования не выполнять:

- изменение visibility репозитория;
- добавление лицензии проекта;
- live deployment или создание внешней инфраструктуры;
- email, Telegram, webhook или иные delivery integrations;
- публикацию screenshots, документов или пользовательских данных;
- изменение calculation, storage, exchange, API или PDF contracts.

## Обязательное чтение для Codex

- `README.md`
- `docs/00_PROJECT_CONTEXT.md`
- `docs/01_PRODUCT_REQUIREMENTS.md`
- `docs/02_ARCHITECTURE.md`
- `docs/03_CALCULATION_MODEL.md`
- `docs/04_DATA_MODEL.md`
- `docs/05_API_CONTRACT.md`
- `docs/06_SECURITY.md`
- `docs/07_ROADMAP.md`
- `docs/08_HANDOFF.md`
- `docs/09_WORKFLOW.md`

## Разделение ответственности

Codex изменяет code, tests, fixtures, styles и необходимые technical configuration files. Codex не изменяет `README.md` или `docs/**`.

GPT проводит review кода из GitHub и самостоятельно ведёт документацию.

Владелец выполняет commit/push только после review и затем синхронизирует документационные commits GPT.

## Постоянные ограничения

- не менять `site-stalarvision`;
- не использовать реальные данные;
- не добавлять лицензию;
- не публиковать repository;
- не выполнять deployment;
- не добавлять зависимости вне согласованного scope;
- не выполнять commit/push из Codex;
- не изменять `README.md` и `docs/**` из Codex.
