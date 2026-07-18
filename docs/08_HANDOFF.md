# 08. Handoff

## Текущий статус

Этап 2 завершён и проверен. Implementation commit:

`fb120b32681da74fa7c929b6a9a6541567af0a26`

Реализованы frontend/backend scaffolds, exact calculation core, shared fixtures, tests и первые API endpoints. Production UI, drafts, export, PDF, Docker и deployment ещё отсутствуют.

## Проверенное состояние

- frontend: 30 tests, production build и type-check проходят;
- backend: 63 tests и application import/startup check проходят;
- TypeScript использует `bigint`, Python — `int`;
- общие fixtures подтверждают одинаковую расчётную семантику;
- request body limit проверяет фактические ASGI chunks;
- request ID валидируется;
- staging и patch прошли whitespace review;
- реальных данных и секретов не добавлено.

## Следующий этап

Этап 3: основной responsive UI, локальный расчёт и draft management.

Не входят в Этап 3:

- JSON/CSV export;
- backend preview integration;
- PDF;
- Docker Compose;
- deployment.

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
