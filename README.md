# QuoteFlow

QuoteFlow — калькулятор сметы и генератор коммерческого предложения для малого бизнеса, экспертов и небольших команд.

Это собственный демонстрационный продукт Stalar Vision, а не клиентский проект. Он создаётся как честный публичный пример проектирования небольшого прикладного продукта. В проекте нельзя использовать вымышленных клиентов, отзывы, статистику или неподтверждённые коммерческие результаты.

## Практическая задача

QuoteFlow позволяет подготовить локальный расчёт по позициям, применить скидки и пользовательскую налоговую ставку, увидеть итог, сохранить черновик в браузере, импортировать или экспортировать строгий JSON, выгрузить позиции в CSV и явно проверить расчёт через backend preview. Предложение можно распечатать через браузер; backend также формирует PDF по строгому входному контракту, но UI пока не вызывает PDF endpoint.

Приложение является демонстрационным инструментом, не заменяет бухгалтерское или юридическое сопровождение и не предназначено для реальных персональных, коммерческих или конфиденциальных данных. Расчёты необходимо проверять.

## Реализовано

- responsive React + TypeScript + Vite интерфейс;
- Tailwind CSS;
- поля проекта и условных данных клиента;
- динамические позиции;
- локальная validation с touched-field UX;
- точный локальный расчёт без floating-point арифметики;
- точное форматирование денежных значений во всём поддерживаемом диапазоне;
- итоговая панель и line totals;
- сохранение, открытие, удаление и полная очистка черновиков через `localStorage`;
- изолированный versioned storage key `quoteflow:drafts:v1`;
- видимые demo/privacy предупреждения;
- keyboard/focus и базовый accessibility слой;
- versioned JSON import/export только для строгого `QuoteCalculationInput`;
- CSV export с точными decimal strings, UTF-8 BOM и защитой от spreadsheet formula injection;
- read-only payload preview без автоматической отправки;
- явная frontend-интеграция с calculation preview API;
- timeout, abort, replacement и stale-response protection;
- print-friendly представление и действие `Печать / сохранить PDF` через браузерную печать;
- FastAPI backend scaffold;
- точное расчётное ядро на TypeScript `bigint` и Python `int`;
- документированный `ROUND_HALF_UP`;
- общие synthetic golden/invalid fixtures;
- 135 frontend tests;
- 78 backend tests;
- `GET /api/health`;
- `POST /api/v1/calculations/preview`;
- `POST /api/v1/documents/pdf`;
- серверная in-memory PDF generation через ReportLab с кириллицей, встроенными DejaVu Sans и многостраничными таблицами;
- строгая input validation и стабильные error codes;
- request ID;
- фактическое ограничение request body в 256 KiB;
- CORS allowlist через environment;
- безопасные `.gitignore`, `.gitattributes` и `.env.example`.

## Ещё не реализовано

- UI integration с PDF endpoint;
- Docker Compose;
- production deployment.

## Стек

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Vitest, Testing Library.
- Backend: Python 3.12+, FastAPI, Pydantic, ReportLab, pytest, pypdf для тестов.
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

Этапы 0–5 завершены. Следующий этап — integration/QA, Docker Compose, dependency audit и итоговая проверка MVP.

Проверенный implementation commit Этапа 5: `cdbc22f395c7971fafa85eb3ff20a19152254192`.

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
