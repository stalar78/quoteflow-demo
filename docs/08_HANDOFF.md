# 08. Handoff

## Текущий статус

Stage 7A release-readiness завершён и проверен. Implementation commit:

`eb3f14c45c19048d615a2356a065d4eb5b1819e3`

Добавлены отдельный frontend server-PDF download и GitHub Actions CI. Browser print остаётся независимым. Первый workflow run `CI #1` завершился успешно. Репозиторий был публичным с момента создания. MIT License согласована и добавлена. Stage 7B Beget deployment preparation находится на review; live deployment не выполнялся.

## Проверенное состояние

- frontend: 158 tests, production build и type-check проходят;
- backend: 78 tests и application import/startup check проходят;
- TypeScript calculation core использует `bigint`, Python — `int`;
- UI adapters преобразуют ruble/percent strings точной integer arithmetic;
- денежное форматирование не делит minor units через floating point;
- общие fixtures подтверждают одинаковую расчётную семантику frontend/backend;
- responsive UI проверен на desktop, tablet и mobile screenshots;
- untouched fields остаются нейтральными, ошибки появляются после blur и очищаются после исправления;
- drafts сохраняются только в `quoteflow:drafts:v1`;
- storage parsing/version/write failures обрабатываются безопасно;
- удаление и очистка не затрагивают другие localStorage keys;
- request body limit проверяет фактические ASGI chunks;
- request ID валидируется;
- PDF endpoint повторно считает totals и не принимает arbitrary HTML/template/URL/filename/path;
- PDF создаётся in-memory через ReportLab и возвращается с `no-store`, `nosniff` и фиксированным filename;
- пользовательский текст экранируется перед markup-aware ReportLab objects;
- DejaVu Sans assets и license включены в wheel через явную package-data configuration;
- установленный wheel вне source checkout успешно генерирует PDF с извлекаемой кириллицей;
- browser print доступен только для валидного расчёта с непустым названием и не вызывает backend;
- отдельный server PDF action отправляет только strict input и доступен при тех же validity/project-name условиях;
- PDF client ограничивает фактически прочитанный stream 2 MiB, проверяет MIME и `%PDF-`, использует фиксированный filename;
- 15-second timeout, replacement/edit/reset/import/open/unmount abort и newest-only download покрыты тестами;
- длинный PDF и print-table поддерживают многостраничность и повторение заголовка;
- JSON export не содержит draft metadata, timestamps, request IDs или totals;
- JSON import ограничен 256 KiB, требует versioned envelope и сохраняет текущий draft при ошибке;
- imported money/percent values преобразуются без floating point;
- CSV использует UTF-8 BOM, CRLF, exact decimal strings и formula-injection protection;
- payload preview отображает только strict input и ничего не отправляет автоматически;
- API preview выполняется только по explicit click и отправляет только `QuoteCalculationInput`;
- API response проходит exact runtime validation и сравнивается с локальным result;
- timeout, abort-on-edit, request replacement и stale-response protection покрыты тестами;
- DataExchangePanel расположен full-width вне sticky sidebar;
- Compose публикует только frontend на `127.0.0.1:8080`, backend остаётся внутри private network;
- frontend/backend runtime users непривилегированные, mounts/volumes/privileged mode отсутствуют;
- Nginx `/api/` proxy, SPA fallback, missing-asset 404, cache policy и baseline security headers проверены;
- оба services прошли healthchecks без restart, а полный build/up/smoke/down cycle завершён;
- calculation preview, safe/unsafe request IDs, malformed JSON, strict unknown-field rejection и backend 413 проверены через reverse proxy;
- server PDF через proxy сохранил MIME/headers, кириллицу, totals и in-memory boundary;
- frontend runtime не содержит Node/npm, backend runtime не содержит test dependencies или `/wheels`;
- browser QA пройден на шести viewports без horizontal scroll; axe scan сообщил 0 violations;
- npm и pip audits не выявили известных уязвимостей на момент Stage 6;
- staging и patch прошли whitespace review;
- реальных данных и секретов не добавлено;
- working tree владельца после push был чистым;
- CI использует read-only permissions, pinned official actions, disabled credential persistence и finite timeouts;
- frontend/backend/Docker CI jobs первого Stage 7A workflow завершились успешно; publication и deployment jobs отсутствуют.

## Следующий этап

Stage 7B: review подготовленной конфигурации для существующего Beget VPS.

Согласовано:

- public repository с момента создания;
- MIT License с copyright владельца;
- `https://quoteflow.stalarvision.ru/`;
- system Nginx как TLS/public ingress;
- production frontend только на `127.0.0.1:8081`;
- backend только внутри Docker network.

Перед live deployment:

- собрать read-only сведения о RAM, disk, swap, Docker, текущих containers, Nginx, certificates, ports, firewall и DNS;
- выполнить dependency, secret, Git-history, container, CORS, rate-limit и production configuration audit;
- проверить production Compose build/health/smoke и rollback inputs;
- получить отдельное прямое разрешение владельца.

Без такого разрешения не выполнять live deployment, DNS/certificate/server mutations или создание внешнего monitoring. Не изменять `site-stalarvision`, calculation/storage/exchange/API/PDF contracts и не добавлять delivery integrations.

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
- `docs/10_DEPLOYMENT_BEGET.md`

## Разделение ответственности

GPT может читать и изменять любые доступные файлы GitHub, если это прямо входит в согласованный scope и не конфликтует с незакоммиченными локальными изменениями.

Codex используется преимущественно для сложной локальной реализации кода. Для экономии токенов рутинные GitHub-операции, документацию, review и небольшие безопасные изменения выполняет GPT; локальные команды и проверки может выполнять владелец.

При dirty local working tree удалённые code/config changes откладываются до commit/push и синхронизации. Владелец выполняет локальные commit/push и validation, если отдельно не согласован GitHub write workflow.

## Постоянные ограничения

- не менять `site-stalarvision`;
- не использовать реальные данные;
- не менять согласованную MIT License без отдельного решения;
- не изменять visibility репозитория;
- не выполнять live deployment до resource/audit gate;
- не добавлять зависимости вне согласованного scope;
- не выполнять commit/push из Codex без отдельного прямого разрешения;
- не изменять `README.md` и `docs/**` из Codex без отдельного прямого разрешения;
- не выполнять фактический Stage 7B deployment без отдельного решения владельца.
