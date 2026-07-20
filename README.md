# QuoteFlow

QuoteFlow — калькулятор сметы и генератор коммерческого предложения для малого бизнеса, экспертов и небольших команд.

Это собственный демонстрационный продукт Stalar Vision, а не клиентский проект. Он создаётся как честный публичный пример проектирования небольшого прикладного продукта. В проекте нельзя использовать вымышленных клиентов, отзывы, статистику или неподтверждённые коммерческие результаты.

## Практическая задача

QuoteFlow позволяет подготовить локальный расчёт по позициям, применить скидки и пользовательскую налоговую ставку, увидеть итог, сохранить черновик в браузере, импортировать или экспортировать строгий JSON, выгрузить позиции в CSV и явно проверить расчёт через backend preview. Предложение можно распечатать через браузер или отдельным явным действием скачать сформированный backend PDF по тому же строгому входному контракту.

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
- отдельное действие `Скачать PDF с сервера` для `POST /api/v1/documents/pdf`;
- bounded streaming PDF response до 2 MiB, MIME/signature validation, 15-second timeout, abort/replacement и stale-response protection;
- FastAPI backend scaffold;
- точное расчётное ядро на TypeScript `bigint` и Python `int`;
- документированный `ROUND_HALF_UP`;
- общие synthetic golden/invalid fixtures;
- 158 frontend tests;
- 78 backend tests;
- `GET /api/health`;
- `POST /api/v1/calculations/preview`;
- `POST /api/v1/documents/pdf`;
- серверная in-memory PDF generation через ReportLab с кириллицей, встроенными DejaVu Sans и многостраничными таблицами;
- строгая input validation и стабильные error codes;
- request ID;
- фактическое ограничение request body в 256 KiB;
- CORS allowlist через environment;
- безопасные `.gitignore`, `.gitattributes` и `.env.example`;
- локальный Docker Compose-контур из frontend и backend;
- production-like Nginx routing `/api/` во внутренний FastAPI service;
- multi-stage frontend/backend images и непривилегированные runtime users;
- healthchecks, loopback-only публикация frontend и отсутствие host-порта backend;
- GitHub Actions CI для push/PR в `main`: frontend, backend и Docker build jobs с read-only permissions, pinned official actions и finite timeouts.

## Ещё не реализовано

- production deployment;
- публичная публикация репозитория.

## Стек

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Vitest, Testing Library.
- Backend: Python 3.12+, FastAPI, Pydantic, ReportLab, pytest, pypdf для тестов.
- Local integration: Docker Compose, unprivileged Nginx и два изолированных service containers.
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

Локальный Docker Compose-контур:

```bash
docker compose up -d --build
```

Приложение будет доступно только на `http://127.0.0.1:8080`; backend остаётся внутри Compose network. Остановка и удаление локальных containers/network:

```bash
docker compose down --remove-orphans
```

Этот контур предназначен для локальной проверки и не является production deployment.

## Статус

Этапы 0–6 и Stage 7A release-readiness завершены. Локальный integration/QA-контур и первый GitHub Actions workflow проверены; `CI #1` завершился успешно. Stage 7B — публикация и deployment — не начат и требует отдельного решения владельца.

Проверенный implementation commit Stage 7A: `eb3f14c45c19048d615a2356a065d4eb5b1819e3`.

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
