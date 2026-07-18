# 07. Roadmap

## Этап 0 — согласование рамки

Статус: **завершён**.

Зафиксированы название, локальный путь, стек, модель хранения, ограничения MVP и границы репозиториев.

## Этап 1 — архитектура и документация

Статус: **завершён**.

Созданы и проверены project context, product requirements, architecture, calculation model, data model, API contract, security boundaries, workflow и handoff. Создан приватный GitHub-репозиторий `stalar78/quoteflow-demo`.

## Этап 2 — scaffold и расчётное ядро

Статус: **следующий**.

План:

- scaffold React/TypeScript/Vite frontend;
- scaffold FastAPI backend;
- минимальные конфигурации lint/test/build;
- безопасные `.gitignore` и `.env.example`;
- shared synthetic golden fixtures;
- exact-integer calculation core во frontend и backend;
- unit tests расчётной модели;
- базовые endpoints `/api/health` и `/api/v1/calculations/preview`;
- локальные команды запуска;
- без UI продукта, PDF и Docker Compose на этом этапе.

## Этап 3 — основной UI и черновики

- расчётная форма и dynamic items;
- validation и ошибки;
- итоговый блок;
- localStorage draft management;
- responsive behavior;
- accessibility baseline.

## Этап 4 — PDF

- technical spike и обоснованный выбор библиотеки;
- русский текст, переносы и многостраничность;
- безопасная PDF generation;
- print-friendly representation.

## Этап 5 — export и API preview

- JSON import/export;
- CSV export;
- payload preview;
- документация фактической реализации.

## Этап 6 — integration и QA

- Docker Compose;
- frontend/backend integration;
- полный test/build;
- dependency audit;
- responsive/accessibility QA;
- screenshots;
- security/publication review.

## Этап 7 — публикация и deployment

- решение о публичности репозитория;
- добавление лицензии после согласования;
- public GitHub только после audit;
- live deployment только после отдельного review.

Будущие этапы не считаются выполненными.
