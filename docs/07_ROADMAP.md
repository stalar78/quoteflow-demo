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

Статус: **завершён**.

Реализованы:

- backend PDF generation через ReportLab Platypus;
- `POST /api/v1/documents/pdf` со строгим `QuoteCalculationInput`;
- обязательное непустое название проекта для document generation;
- повторный exact-integer расчёт totals на backend;
- полностью in-memory generation без временных файлов;
- безопасная обработка пользовательского текста без произвольного HTML/templates/URL/path;
- русский текст через встроенные DejaVu Sans и DejaVu Sans Bold;
- license-файл шрифтов и явная wheel package-data configuration;
- перенос длинного текста, многостраничные таблицы и повторение заголовка;
- фиксированный безопасный filename, `no-store`, `nosniff` и request ID;
- независимое frontend print-friendly representation через `window.print()`;
- print action только для валидного расчёта с непустым названием;
- 70 frontend tests и 78 backend tests;
- production frontend build, type-check, wheel contents и installed-wheel PDF smoke verification.

Проверенный implementation commit: `3d6e8b61984d0caada7e7382207d5b862c9158aa`.

Не реализованы на этом этапе: JSON/CSV export, UI-to-backend integration, отправка документов, Docker и deployment.

## Этап 5 — export и API integration

Статус: **завершён**.

Реализованы:

- versioned JSON export envelope только со строгим `QuoteCalculationInput`;
- strict JSON import до 256 KiB без silent migration;
- преобразование imported input в новый `EditableDraft` с exact integer conversions;
- CSV export с UTF-8 BOM, CRLF, fixed columns и exact decimal strings;
- spreadsheet formula-injection protection;
- read-only payload preview без автоматической отправки;
- явная интеграция UI с `POST /api/v1/calculations/preview`;
- Vite development proxy `/api` на локальный FastAPI;
- safe client request ID и runtime response validation;
- loading, success, mismatch, safe error и retry states;
- 10-second timeout, abort-on-edit, request replacement и stale-response protection;
- full-width responsive data-exchange section вне sticky sidebar;
- 135 frontend tests, production build и TypeScript check.

Проверенный implementation commit: `cdbc22f395c7971fafa85eb3ff20a19152254192`.

Не реализованы на этом этапе: PDF endpoint integration из UI, Docker, deployment и внешняя отправка.

## Этап 6 — integration и QA

Статус: **завершён**.

Реализованы и проверены:

- Docker Compose с отдельными frontend/backend services;
- loopback-only frontend на `127.0.0.1:8080` и backend без host publish;
- multi-stage wheel-based backend image и Nginx frontend image;
- непривилегированные runtime users и healthchecks;
- production-like Nginx routing `/api/`, SPA fallback, cache policy и baseline security headers;
- полный container build/up/smoke/down cycle без mounts, volumes или privileged mode;
- сквозные health, calculation preview, validation, oversized body и PDF checks через reverse proxy;
- проверка runtime contents, users, image history и отсутствия test/build tooling;
- 135 frontend tests, production build и TypeScript check;
- 78 backend tests, import smoke и installed-wheel verification;
- npm и pip dependency audits без известных уязвимостей на момент проверки;
- responsive browser QA на шести viewports, screenshots во временном каталоге и automated axe scan с 0 violations;
- JSON/CSV import/export, API preview, browser print и PDF smoke в едином локальном окружении;
- корректная остановка с удалением Stage 6 containers/network без project volumes.

Проверенный implementation commit: `63833f88f97da1406a2b8ae0341e90da806aa5e2`.

Stage 6 не выполнял publication или deployment и не менял calculation, exchange, storage или PDF contracts.

## Этап 7 — публикация и deployment

Статус: **следующий только после отдельного решения владельца**.

- принять решение о сохранении приватности или публичной публикации;
- согласовать лицензию до её добавления;
- повторить publication/security audit непосредственно перед изменением видимости;
- определить production platform, TLS, secrets, CORS, rate limiting, logging и monitoring до deployment;
- public GitHub и live deployment выполнять только после явного отдельного согласования.
