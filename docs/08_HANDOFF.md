# 08. Handoff

## Текущий статус

Этап 5 завершён и проверен. Implementation commit:

`cdbc22f395c7971fafa85eb3ff20a19152254192`

Реализованы versioned JSON import/export, safe CSV export, read-only payload preview и явная frontend-интеграция с calculation preview API. Docker и deployment ещё отсутствуют; PDF endpoint из UI не вызывается.

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
- staging и patch прошли whitespace review;
- реальных данных и секретов не добавлено;
- working tree владельца после push был чистым.

## Следующий этап

Этап 6: integration и QA.

Минимальные задачи Этапа 6:

- добавить Docker Compose для локального frontend/backend launch;
- определить production-like local routing для `/api` без deployment;
- выполнить полный frontend/backend test and build matrix;
- выполнить dependency audit без automatic force fixes;
- провести responsive и accessibility QA с screenshots;
- проверить JSON/CSV, API preview, print и PDF в одном local environment;
- проверить security/publication boundaries, секреты и synthetic data;
- не изменять calculation semantics и versioned exchange contracts.

Не входят в Этап 6 без отдельного согласования:

- произвольная внешняя отправка;
- email, Telegram или webhooks;
- Docker Compose;
- deployment;
- публикация репозитория.

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
