# 08. Handoff

## Текущий статус

Проект находится на Этапе 1: `architecture and documentation stage`.

Создана проектная документация. Frontend, backend, тесты, зависимости, Docker-конфигурация и deployment не создавались.

## Принятые решения

- `QuoteFlow` — самостоятельный проект.
- Проект является собственным демонстрационным продуктом Stalar Vision.
- Нельзя позиционировать проект как клиентский кейс.
- Предварительное имя будущего GitHub repository: `stalar78/quoteflow-demo`.
- GitHub repository пока не создается.
- Drafts хранятся только в `localStorage`.
- Ключ draft storage: `quoteflow:drafts:v1`.
- Backend планируется stateless.
- Server storage в MVP отсутствует.
- Основная валюта MVP: `RUB`.
- Денежные значения хранятся в копейках.
- Скидки и налог хранятся в basis points.
- Округление: `ROUND_HALF_UP`.

## Созданные документы

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

## Еще не реализовано

- frontend scaffold;
- backend scaffold;
- package manager configuration;
- Python environment;
- dependencies;
- calculation implementation;
- tests;
- fixtures;
- JSON import/export;
- CSV export;
- API endpoints;
- PDF generation;
- Docker configuration;
- production build;
- GitHub publication;
- deployment.

## Ограничения

- Не использовать реальные персональные, коммерческие или конфиденциальные данные.
- Не создавать клиентские истории, отзывы или неподтвержденные метрики.
- Не добавлять лицензию без отдельного решения.
- Не создавать remote без review.
- Не выполнять commit, push, GitHub publication или deployment без review.
- Не изменять файлы за пределами каталога QuoteFlow.

## Следующий предполагаемый этап

Этап 2: scaffold frontend/backend, конфигурация проверок, synthetic fixtures, calculation core и unit tests.

Перед началом Этапа 2 следующий исполнитель должен прочитать:

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

## Запреты перед review

До отдельного review запрещены:

- commit;
- push;
- создание remote;
- создание GitHub repository;
- production deployment;
- публикация проекта как готового продукта.
