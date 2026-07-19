# 08. Handoff

## Текущий статус

Этап 4 завершён и проверен. Implementation commit:

`3d6e8b61984d0caada7e7382207d5b862c9158aa`

Реализованы server-side PDF generation, строгий PDF endpoint и независимое browser print representation. JSON/CSV export, UI-to-backend integration, Docker и deployment ещё отсутствуют.

## Проверенное состояние

- frontend: 70 tests, production build и type-check проходят;
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
- staging и patch прошли whitespace review;
- реальных данных и секретов не добавлено;
- working tree владельца после push был чистым.

## Следующий этап

Этап 5: JSON/CSV export и интеграция UI с существующими backend endpoints.

Минимальные задачи Этапа 5:

- реализовать versioned JSON export/import со строгой проверкой недоверенного input;
- реализовать безопасный CSV export;
- подключить UI к calculation preview endpoint без изменения расчётной семантики;
- добавить payload preview и понятные состояния network/error;
- сохранить local-first draft workflow;
- не дублировать и не ослаблять backend validation;
- добавить synthetic integration tests;
- сохранить PDF и print boundaries Этапа 4.

Не входят в Этап 5 без отдельного согласования:

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
