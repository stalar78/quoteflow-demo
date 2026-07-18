# 08. Handoff

## Текущий статус

Этап 3 завершён и проверен. Implementation commit:

`8fec0b323bc31c9e5e10d8870f80e087fa6afed0`

Реализованы responsive product UI, editable draft state, локальная validation, exact local calculation, summary и управление browser drafts. JSON/CSV export, UI-to-backend integration, PDF, Docker и deployment ещё отсутствуют.

## Проверенное состояние

- frontend: 64 tests, production build и type-check проходят;
- backend: 63 tests и application import/startup check проходят;
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
- staging и patch прошли whitespace review;
- реальных данных и секретов не добавлено;
- working tree владельца после push был чистым.

## Следующий этап

Этап 4: PDF technical spike, print-friendly representation и безопасная PDF generation.

Минимальные задачи Этапа 4:

- выбрать и обосновать PDF library;
- определить, выполняется ли PDF generation на backend;
- использовать пользовательский текст только как данные;
- обеспечить русский текст и лицензируемый шрифт;
- поддержать длинные строки и несколько страниц;
- не принимать произвольный template, URL или filesystem path;
- добавить synthetic PDF tests и smoke verification;
- сохранить exact calculation semantics.

Не входят в Этап 4 без отдельного согласования:

- JSON/CSV import/export;
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
