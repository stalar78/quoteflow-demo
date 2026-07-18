# 07. Roadmap

## Этап 0 — согласование рамки

Статус: **завершён**.

Зафиксированы название, локальный путь, стек, модель хранения, ограничения MVP и границы репозиториев.

## Этап 1 — архитектура и документация

Статус: **завершён**.

Созданы project context, requirements, architecture, calculation/data/API contracts, security boundaries, workflow и handoff. Создан приватный репозиторий `stalar78/quoteflow-demo`.

## Этап 2 — scaffold и расчётное ядро

Статус: **завершён**.

Реализованы:

- React/TypeScript/Vite scaffold;
- FastAPI scaffold;
- exact-integer calculation core во frontend и backend;
- shared golden/invalid fixtures;
- 30 frontend tests;
- 63 backend tests;
- health и calculation preview endpoints;
- strict validation и stable error codes;
- request ID, CORS allowlist и фактический body-size limit;
- безопасные базовые repository configuration files.

Проверенный implementation commit: `fb120b32681da74fa7c929b6a9a6541567af0a26`.

## Этап 3 — основной UI и черновики

Статус: **следующий**.

План:

- деловой responsive layout;
- project/client fields;
- dynamic items;
- локальная validation и понятные ошибки;
- локальный calculation result;
- sticky summary на desktop;
- draft list/save/open/delete/clear через `localStorage`;
- видимое demo/privacy предупреждение;
- keyboard navigation, focus states и accessibility baseline;
- UI/component tests.

Не входят: JSON/CSV export, backend integration, PDF, Docker и deployment.

## Этап 4 — PDF

- technical spike и выбор библиотеки;
- русский текст, переносы и многостраничность;
- безопасная PDF generation;
- print-friendly representation.

## Этап 5 — export и API integration

- JSON import/export;
- CSV export;
- backend preview integration;
- payload preview;
- документация фактической реализации.

## Этап 6 — integration и QA

- Docker Compose;
- полный test/build;
- dependency audit;
- responsive/accessibility QA;
- screenshots;
- security/publication review.

## Этап 7 — публикация и deployment

- решение о публичности;
- лицензия после согласования;
- public GitHub только после audit;
- live deployment только после отдельного review.
