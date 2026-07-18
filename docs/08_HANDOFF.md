# 08. Handoff

## Текущий статус

Этап 1 завершён. Документация находится в приватном репозитории `stalar78/quoteflow-demo` и прошла первичное архитектурное, продуктовый и security review.

Frontend, backend, зависимости, tests, fixtures, Docker и deployment ещё не созданы.

## Принятые решения

- QuoteFlow — собственный демонстрационный продукт Stalar Vision, не клиентский кейс.
- Frontend: React, TypeScript, Vite, Tailwind CSS, Vitest, Testing Library.
- Backend: FastAPI, Pydantic, pytest; backend stateless.
- Draft storage: только `localStorage`, ключ `quoteflow:drafts:v1`.
- Server database отсутствует.
- Валюта: `RUB`; деньги — целые копейки.
- Quantity — decimal string с тремя знаками точности.
- Rates — integer basis points.
- Округление — `ROUND_HALF_UP`.
- Frontend использует exact-integer arithmetic; backend — Python `int`.
- Общие golden fixtures обязательны.
- Лицензия, public repository и production deployment требуют отдельного решения.

## Следующий этап

Этап 2 включает scaffold frontend/backend, конфигурацию проверок, synthetic fixtures, calculation core, tests и два базовых API endpoints.

Не входят в Этап 2:

- продуктовый UI;
- draft management;
- JSON/CSV export;
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

Codex изменяет код, tests, fixtures и необходимые технические конфигурации. Codex не изменяет `README.md` или `docs/**`.

GPT проводит review фактически отправленного кода и самостоятельно ведёт документацию непосредственно в GitHub.

Владелец проверяет результат Codex и выполняет локальные commit/push только после review.

## Обязательные ограничения

- не менять `site-stalarvision`;
- не использовать реальные данные;
- не добавлять лицензию;
- не создавать public deployment;
- не добавлять зависимости вне согласованного scope;
- не выполнять commit или push из Codex;
- не изменять `README.md` и `docs/**` из Codex.
