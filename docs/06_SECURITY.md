# 06. Security

QuoteFlow нельзя описывать как полностью безопасный. Документ фиксирует реализованные границы и требования, которые остаются обязательными перед публичным размещением.

## Реализовано на Этапах 2–3

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
- backend tests покрывают основные security boundaries API.

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

## JSON import

Import ещё не реализован. JSON должен обрабатываться как недоверенный input, иметь ограничение размера, проверяться по `schemaVersion` и строгой схеме. Неизвестные поля и несовместимые версии не должны молча мигрировать.

## PDF boundaries

PDF ещё не реализован. Пользовательский текст должен обрабатываться как данные, а не HTML. Backend не должен принимать произвольный template, URL или filename. Предпочтительна генерация в памяти; временные файлы должны гарантированно удаляться.

## До public deployment обязательно

- rate limiting;
- production CORS allowlist;
- безопасные HTTP headers;
- dependency audit без automatic force fix;
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
