# 06. Security

QuoteFlow нельзя описывать как полностью безопасный. Документ фиксирует реализованные границы и требования, которые остаются обязательными перед публичным размещением.

## Реализовано на Этапе 2

- секреты и `.env` исключены через `.gitignore`;
- `.env.example` содержит только безопасные локальные значения;
- Pydantic schemas запрещают неизвестные поля;
- frontend и backend проверяют длины, диапазоны, количество items, schema version и duplicate IDs;
- backend самостоятельно пересчитывает totals;
- request body ограничен 256 KiB по фактически полученным chunks;
- oversized body не передаётся в приложение частично;
- request ID ограничен безопасным ASCII-паттерном и длиной 64;
- malformed JSON, validation, calculation и internal errors возвращаются без stack trace;
- CORS использует allowlist из environment;
- приложение не реализует внешнюю отправку;
- fixtures являются synthetic;
- тесты покрывают основные security boundaries API.

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
- XSS в будущем UI при небезопасном рендеринге текста.

## Logging

Приложение не должно логировать request body или пользовательские текстовые поля. Логи не должны содержать токены, персональные или конфиденциальные данные. `requestId` является только техническим идентификатором.

## Browser storage

Draft storage ещё не реализован. Будущий `localStorage`:

- доступен скриптам текущего origin;
- может быть очищен браузером;
- не является надёжным долговременным или конфиденциальным хранилищем;
- требует видимого предупреждения не вводить реальные данные;
- должен поддерживать удаление одного draft и полную очистку.

## JSON import

Import ещё не реализован. JSON должен обрабатываться как недоверенный input, иметь ограничение размера, проверяться по `schemaVersion` и строгой схеме. Неизвестные поля и несовместимые версии не должны молча мигрировать.

## PDF boundaries

PDF ещё не реализован. Пользовательский текст должен обрабатываться как данные, а не HTML. Backend не должен принимать произвольный template или filename. Предпочтительна генерация в памяти; временные файлы должны гарантированно удаляться.

## До public deployment обязательно

- rate limiting;
- production CORS allowlist;
- безопасные HTTP headers;
- dependency audit без automatic force fix;
- проверка Git history на секреты;
- review frontend rendering и XSS boundaries;
- review PDF library и assets licenses;
- проверка отсутствия реальных данных;
- решение о лицензии репозитория.

## Запрещённые интеграции MVP

- произвольные внешние URL;
- реальные email/Telegram/webhook delivery;
- скрытая передача данных;
- API keys во frontend, Git или логах.
