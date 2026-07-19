# QuoteFlow

QuoteFlow — калькулятор сметы и генератор коммерческого предложения для малого бизнеса, экспертов и небольших команд.

Это собственный демонстрационный продукт Stalar Vision, а не клиентский проект. Он создаётся как честный публичный пример проектирования небольшого прикладного продукта. В проекте нельзя использовать вымышленных клиентов, отзывы, статистику или неподтверждённые коммерческие результаты.

## Практическая задача

QuoteFlow позволяет подготовить локальный расчёт по позициям, применить скидки и пользовательскую налоговую ставку, увидеть итог, сохранить черновик в браузере и распечатать корректно рассчитанное предложение. Backend также формирует PDF-документ по строгому входному контракту; UI пока не вызывает этот endpoint.

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
- print-friendly представление и действие `Печать / сохранить PDF` через браузерную печать;
- FastAPI backend scaffold;
- точное расчётное ядро на TypeScript `bigint` и Python `int`;
- документированный `ROUND_HALF_UP`;
- общие synthetic golden/invalid fixtures;
- 70 frontend tests;
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

- JSON/CSV import/export;
- backend integration из UI;
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

Этапы 0–4 завершены. Следующий этап — JSON/CSV export и интеграция UI с существующими backend endpoints.

Проверенный implementation commit Этапа 4: `3d6e8b61984d0caada7e7382207d5b862c9158aa`.

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
