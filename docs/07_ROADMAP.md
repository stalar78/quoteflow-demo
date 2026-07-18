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
- 30 frontend calculation-core tests;
- 63 backend tests;
- health и calculation preview endpoints;
- strict validation и stable error codes;
- request ID, CORS allowlist и фактический body-size limit;
- безопасные базовые repository configuration files.

Проверенный implementation commit: `fb120b32681da74fa7c929b6a9a6541567af0a26`.

## Этап 3 — основной UI и черновики

Статус: **завершён**.

Реализованы:

- деловой responsive layout;
- Tailwind CSS;
- project/client fields;
- dynamic items;
- локальная validation с touched-field UX;
- локальный exact-integer calculation result;
- точное форматирование денег на всём поддерживаемом диапазоне;
- sticky summary на desktop;
- draft list/save/open/delete/clear через `localStorage`;
- versioned storage envelope `quoteflow:drafts:v1`;
- видимое demo/privacy предупреждение;
- keyboard navigation, focus states и accessibility baseline;
- responsive/mobile correction pass;
- 64 frontend tests;
- успешные production build и TypeScript check.

Проверенный implementation commit: `8fec0b323bc31c9e5e10d8870f80e087fa6afed0`.

Не реализованы на этом этапе: JSON/CSV export, backend integration, PDF, Docker и deployment.

## Этап 4 — PDF

Статус: **следующий**.

План:

- technical spike и документированный выбор библиотеки;
- print-friendly representation;
- безопасная PDF generation;
- русский текст и шрифты;
- перенос длинного текста;
- многостраничные документы;
- корректные деньги, скидки и налог;
- synthetic demo content;
- тесты PDF boundary и smoke verification.

Не входят без отдельного согласования: JSON/CSV export, отправка документов, Docker и deployment.

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
