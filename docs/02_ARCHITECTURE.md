# 02. Архитектура

## Планируемая структура

```text
frontend/
  src/
    components/
    features/
      calculation/
      drafts/
      export/
    lib/
    services/
    types/
  tests/

backend/
  app/
    api/
    core/
    schemas/
    services/
  tests/

fixtures/
  calculations/

docs/
```

Эта структура описывает будущую организацию проекта. На Этапе 1 эти каталоги с кодом не создаются.

## Frontend boundary

Frontend планируется как React + TypeScript приложение на Vite. Его зона ответственности:

- пользовательский интерфейс;
- редактирование расчета;
- локальная предварительная validation;
- локальный расчет для быстрого feedback;
- draft management через `localStorage`;
- JSON import/export;
- CSV export;
- отправка валидного расчета в backend preview;
- получение PDF как файла после backend generation.

Frontend не считается доверенной стороной. Totals, пришедшие из frontend, не должны приниматься backend как источник истины.

## Backend boundary

Backend планируется как Python + FastAPI сервис. Его зона ответственности:

- stateless API;
- повторная server-side validation;
- самостоятельный пересчет totals;
- возвращение нормализованного calculation breakdown;
- PDF generation на более позднем этапе;
- демонстрация стабильного API contract.

Backend не хранит пользовательские расчеты, черновики или документы в MVP.

## Browser storage boundary

Черновики существуют только в браузере. Планируемый ключ:

```text
quoteflow:drafts:v1
```

Черновики:

- не синхронизируются с backend;
- могут быть удалены пользователем;
- могут быть полностью очищены;
- не должны содержать реальные персональные или конфиденциальные данные;
- не позиционируются как надежное долгосрочное хранилище.

## Архитектурные принципы

- Расчетная логика отделена от UI.
- Frontend не считается доверенной стороной.
- Backend повторно валидирует и пересчитывает данные.
- Расчетная семантика frontend и backend проверяется общими golden fixtures.
- PDF по возможности формируется в памяти.
- Временные файлы не сохраняются дольше запроса.
- Приложение не собирает данные скрыто.
- MVP не использует Redis, Celery, PostgreSQL, Kubernetes или очередь задач.
- React Router добавляется только при реальной необходимости.
- Архитектура должна оставаться небольшой и понятной.

## Поток данных

1. Пользователь редактирует draft на frontend.
2. Draft временно сохраняется в `localStorage`.
3. Frontend выполняет локальный расчет для UX.
4. Для backend preview frontend отправляет валидную input model.
5. Backend валидирует input model и пересчитывает totals.
6. Backend возвращает normalized breakdown.
7. Для PDF generation backend снова пересчитывает totals перед созданием документа.
