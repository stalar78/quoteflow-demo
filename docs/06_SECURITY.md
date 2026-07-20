# 06. Security

QuoteFlow нельзя описывать как полностью безопасный. Документ фиксирует реализованные границы и требования, которые остаются обязательными перед публичным размещением.

## Реализовано на Этапах 2–7A

- секреты и `.env` исключены через `.gitignore`;
- `.env.example` содержит только безопасные локальные значения;
- Pydantic schemas запрещают неизвестные поля;
- frontend и backend проверяют длины, диапазоны, количество items, schema version и duplicate IDs для strict input;
- backend самостоятельно пересчитывает totals;
- request body ограничен 256 KiB по фактически полученным chunks;
- oversized body не передаётся в приложение частично;
- request ID ограничен безопасным ASCII-паттерном и длиной 64;
- malformed JSON, validation, calculation и internal errors возвращаются без stack trace;
- CORS использует allowlist из environment;
- Stage 3 UI выполняет расчёт локально и не отправляет draft на сервер;
- React рендерит пользовательский текст как данные, без `dangerouslySetInnerHTML`;
- draft storage использует только versioned key `quoteflow:drafts:v1`;
- ошибки JSON parsing и storage access перехватываются;
- очистка drafts удаляет только ключ QuoteFlow и не вызывает `localStorage.clear()`;
- UI показывает предупреждение не вводить реальные данные;
- fixtures и demo example являются synthetic;
- frontend tests покрывают validation UX и основные storage boundaries;
- backend tests покрывают основные security boundaries API;
- PDF endpoint принимает только строгий calculation input и требует непустое название проекта;
- PDF totals повторно вычисляются доверенным Python-ядром;
- PDF создаётся полностью в памяти без временных файлов;
- endpoint не принимает произвольные HTML, template, URL, filename или filesystem path;
- пользовательский текст экранируется перед markup-aware ReportLab objects;
- response использует фиксированное имя файла, `no-store`, `nosniff` и безопасный request ID;
- DejaVu font assets включены вместе с license-файлом и проверены в установленном wheel;
- frontend print representation рендерит текст через React и вызывает только `window.print()`;
- JSON import ограничен фактическим размером 256 KiB и требует versioned export envelope;
- import отвергает unknown fields, invalid runtime types, duplicate IDs и несовместимые версии до замены текущего draft;
- CSV использует exact decimal strings и neutralizes spreadsheet formula prefixes в пользовательских cells;
- временные download anchors удаляются, а object URLs отзываются deferred cleanup;
- payload preview рендерится как read-only text и сам по себе не отправляет данные;
- backend preview выполняется только по явному действию пользователя;
- API response проверяется как недоверенный runtime input с exact keys, safe IDs, item limits и money bounds;
- timeout, request replacement, abort-on-edit и stale-response protection не позволяют устаревшему ответу изменить актуальный UI state;
- локальный Compose публикует только frontend на `127.0.0.1:8080`, backend не имеет host publish;
- frontend и backend runtime запускаются непривилегированными пользователями;
- Compose не использует bind mounts, project volumes, privileged mode, host networking или Docker socket;
- Nginx применяет `nosniff`, frame denial, referrer/permissions policies, no-cache для HTML и immutable cache для hashed assets;
- Nginx пропускает oversized API body к backend limit без собственного HTML error response;
- multi-stage images отделяют build tooling от runtime; backend runtime не содержит test dependencies и wheel directory, frontend runtime не содержит Node/npm;
- host и container smoke tests подтвердили safe JSON errors, request ID boundaries, strict validation и in-memory PDF через reverse proxy;
- `npm audit`, production-only npm audit и отдельные runtime/test `pip-audit` проверки не выявили известных уязвимостей на момент Stage 6;
- browser QA на шести viewports не выявил horizontal overflow, а automated axe scan сообщил 0 violations;
- server PDF download использует безопасный outbound request ID, 15-second timeout и синхронную invalidation generation для replacement/edit/reset/import/open/unmount;
- PDF response читается bounded stream до 2 MiB с early cancel, проверяется по MIME, непустому body и `%PDF-` signature;
- client не доверяет server filename: используется фиксированное `quoteflow-proposal.pdf`, временные anchor/object URL гарантированно очищаются;
- GitHub Actions CI имеет только `contents: read`, checkout credentials не сохраняются, official actions закреплены полными commit SHA, jobs имеют finite timeouts;
- CI не публикует images/packages/releases, не выполняет deployment и не получает application secrets; первый Stage 7A run завершился успешно.

## Threat model MVP

Основные риски:

- ввод реальных персональных или конфиденциальных данных;
- импорт неожиданного JSON;
- oversized requests;
- HTML/PDF injection через текстовые поля;
- path traversal в будущих filenames;
- утечка пользовательского содержимого через логи;
- случайное добавление секретов в Git history;
- слишком широкие CORS/rate-limit настройки перед public deployment;
- supply-chain и base-image риски при будущих rebuild/deployment;
- XSS при будущих изменениях frontend rendering;
- доступ любых scripts текущего origin к содержимому `localStorage`.

## Logging

Приложение не должно логировать request body, drafts или пользовательские текстовые поля. Логи не должны содержать токены, персональные или конфиденциальные данные. `requestId` является только техническим идентификатором.

## Browser storage

`localStorage`:

- доступен scripts текущего origin;
- может быть очищен браузером или пользователем;
- не является надёжным долговременным или конфиденциальным хранилищем;
- не синхронизируется с backend;
- хранит editable drafts, включая невалидные или незавершённые значения;
- использует versioned envelope и отдельный ключ QuoteFlow;
- поддерживает удаление одного draft и полную очистку данных QuoteFlow.

Сохранение draft не означает, что данные прошли strict calculation или document validation.

## JSON import и CSV export

JSON import реализован как обработка недоверенного файла до 256 KiB. Принимается только envelope версии `1` и типа `quoteflow-calculation`; raw calculation input, неизвестные поля и несовместимые версии отвергаются. Текущий draft заменяется только после полной проверки существующим calculation core. При ошибке исходное состояние сохраняется.

CSV создаётся только из валидного локального расчёта. Все cells quoted, строки используют CRLF, значения денег и процентов формируются целочисленно. Для user-controlled text применяется защита от spreadsheet formula injection. CSV не импортируется обратно.

## PDF boundaries

PDF реализован на backend через ReportLab Platypus. Пользовательский текст обрабатывается как данные и экранируется до передачи в markup-aware объекты. Backend принимает только строгий `QuoteCalculationInput`, не принимает произвольный template, HTML, URL, filename или filesystem path и использует фиксированное безопасное имя ответа.

Frontend server-PDF client считает response недоверенным: ограничивает фактически прочитанный stream 2 MiB, отменяет oversized/obsolete stream, проверяет MIME и `%PDF-` signature и не использует filename из response. Browser print остаётся отдельной локальной функцией.

Документ создаётся в `BytesIO` без записи пользовательских данных на диск. Кириллица обеспечивается локально включёнными DejaVu Sans; wheel smoke test подтверждает доступность шрифтов из установленного пакета. PDF generation не означает, что сервис пригоден для обработки реальных конфиденциальных данных или публичного deployment.

## До public deployment обязательно

- rate limiting;
- production CORS allowlist;
- TLS/reverse-proxy и production HTTP-header review;
- повторный dependency/base-image audit без automatic force fix;
- проверка Git history на секреты;
- review frontend rendering и XSS boundaries;
- review PDF library и licenses всех включённых assets;
- проверка отсутствия реальных данных;
- решение о лицензии репозитория.

## Запрещённые интеграции MVP

- произвольные внешние URL;
- реальные email/Telegram/webhook delivery;
- скрытая передача данных;
- API keys во frontend, Git или логах.
