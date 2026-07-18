# 04. Data Model

Документ фиксирует модель MVP. Названия типов и полей сохраняются на английском языке.

## QuoteCalculationInput

Строгая модель для расчёта и backend preview:

```ts
type QuoteCalculationInput = {
  schemaVersion: "1";
  projectName: string;
  client: QuoteClient;
  items: QuoteItem[];
  overallDiscountBasisPoints: number;
  taxBasisPoints: number;
  comment: string;
  currency: "RUB";
};
```

## QuoteCalculationDraft

Локальный черновик расширяет input метаданными:

```ts
type QuoteCalculationDraft = QuoteCalculationInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
```

Draft state в UI может временно содержать строки, ещё не прошедшие строгую схему. Перед export, preview или PDF он нормализуется в `QuoteCalculationInput`.

## Supporting types

```ts
type QuoteClient = {
  displayName: string;
  contactNote: string;
};

type QuoteItem = {
  id: string;
  name: string;
  description: string;
  quantity: string;
  unit: string;
  unitPriceMinor: number;
  discountBasisPoints: number;
};

type CalculationLineResult = {
  itemId: string;
  lineGrossMinor: number;
  lineDiscountMinor: number;
  lineTotalMinor: number;
};

type CalculationResult = {
  items: CalculationLineResult[];
  subtotalMinor: number;
  overallDiscountMinor: number;
  amountAfterDiscountMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: "RUB";
  calculationVersion: "1";
};
```

`QuoteClient` содержит только условные демонстрационные данные и не является CRM-моделью.

## Constraints

- `schemaVersion`: только `"1"`.
- `projectName`: после trim от 0 до 120 символов для preview; от 1 до 120 для PDF.
- `client.displayName`: от 0 до 120.
- `client.contactNote`: от 0 до 300.
- `items`: от 1 до 100 для валидного input.
- `items[].id`: непустой UUID или другой документированный client-generated identifier, максимум 64 символа.
- `items[].name`: после trim от 1 до 160.
- `items[].description`: от 0 до 1000.
- `items[].quantity`: по правилам calculation model.
- `items[].unit`: после trim от 1 до 30.
- `items[].unitPriceMinor`: целое число в разрешённом диапазоне.
- `items[].discountBasisPoints`, `overallDiscountBasisPoints`, `taxBasisPoints`: целые числа от 0 до 10000.
- `comment`: от 0 до 2000.
- `createdAt`, `updatedAt`: UTC ISO 8601.
- неизвестные поля отклоняются;
- повторяющиеся item IDs отклоняются;
- итоговые суммы никогда не принимаются во входной модели.

## Normalization

- значения строк trim-ятся на границе strict input;
- пустые optional strings становятся `""`;
- quantity преобразуется в каноническую десятичную строку;
- порядок items сохраняется;
- import с неизвестной `schemaVersion` завершается понятной ошибкой;
- миграции между версиями не выполняются молча.

## Draft storage

Ключ: `quoteflow:drafts:v1`.

Хранилище должно поддерживать список, сохранение, открытие, удаление одного draft и полную очистку. Оно не синхронизируется с backend и не считается долговременным или конфиденциальным хранилищем.
