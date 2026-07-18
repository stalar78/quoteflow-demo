# QuoteFlow

QuoteFlow — калькулятор сметы и генератор коммерческого предложения для малого бизнеса, экспертов и небольших команд.

Это собственный демонстрационный продукт Stalar Vision, а не клиентский проект. Он создаётся как честный публичный пример проектирования небольшого прикладного продукта. В проекте нельзя использовать вымышленных клиентов, отзывы, статистику или неподтверждённые коммерческие результаты.

## Практическая задача

QuoteFlow должен позволить подготовить расчёт по позициям, применить скидки и пользовательскую налоговую ставку, сохранить черновик в браузере, экспортировать структурированные данные и сформировать коммерческое предложение в PDF.

Приложение является демонстрационным инструментом, не заменяет бухгалтерское или юридическое сопровождение и не предназначено для реальных персональных, коммерческих или конфиденциальных данных. Расчёты необходимо проверять.

## Реализовано

- React + TypeScript + Vite frontend scaffold;
- FastAPI backend scaffold;
- точное расчётное ядро на TypeScript `bigint` и Python `int`;
- документированный `ROUND_HALF_UP`;
- общие synthetic golden/invalid fixtures;
- frontend unit tests;
- backend calculation и API tests;
- `GET /api/health`;
- `POST /api/v1/calculations/preview`;
- строгая input validation и стабильные error codes;
- request ID;
- фактическое ограничение request body в 256 KiB;
- CORS allowlist через environment;
- безопасные `.gitignore`, `.gitattributes` и `.env.example`.

## Ещё не реализовано

- продуктовый интерфейс калькулятора;
- draft management в `localStorage`;
- JSON/CSV import/export;
- PDF generation;
- print-friendly representation;
- Docker Compose;
- production deployment.

## Стек

- Frontend: React 19, TypeScript, Vite, Vitest, Testing Library.
- Backend: Python 3.12+, FastAPI, Pydantic, pytest.
- Draft storage: только браузерный `localStorage`.
- Server storage: в MVP отсутствует.

## Локальные проверки

Frontend:

```bash
cd frontend
npm ci
npm test
npm run build
npm run lint
```

Backend:

```bash
cd backend
python -m venv .venv
python -m pip install -e ".[test]"
python -m pytest
python -m uvicorn app.main:app --reload
```

## Статус

Этапы 0–2 завершены. Следующий этап — основной responsive UI, локальный расчёт и управление черновиками.

Репозиторий пока остаётся приватным. Лицензия, публичная публикация и production deployment требуют отдельного review.

## Документация

- [Контекст проекта](docs/00_PROJECT_CONTEXT.md)
- [Product requirements](docs/01_PRODUCT_REQUIREMENTS.md)
- [Архитектура](docs/02_ARCHITECTURE.md)
- [Расчётная модель](docs/03_CALCULATION_MODEL.md)
- [Data model](docs/04_DATA_MODEL.md)
- [API contract](docs/05_API_CONTRACT.md)
- [Security](docs/06_SECURITY.md)
- [Roadmap](docs/07_ROADMAP.md)
- [Handoff](docs/08_HANDOFF.md)
- [Workflow](docs/09_WORKFLOW.md)
