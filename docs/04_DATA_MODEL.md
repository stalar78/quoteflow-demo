# 04. Data Model

Документ описывает планируемую модель данных MVP. Названия типов и полей фиксируются на английском языке.

## QuoteCalculationDraft

Корневой объект расчета:

```ts
type QuoteCalculationDraft = {
  schemaVersion: string;
  id: string;
  projectName: string;
  client: QuoteClient;
  items: QuoteItem[];
  overallDiscountBasisPoints: number;
  taxBasisPoints: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  currency: "RUB";
};
```

## QuoteClient

```ts
type QuoteClient = {
  displayName: string;
  contactNote: string;
};
```

`QuoteClient` содержит только условные демонстрационные данные. Это не CRM-модель.

## QuoteItem

```ts
type QuoteItem = {
  id: string;
  name: string;
  description: string;
  quantity: string;
  unit: string;
  unitPriceMinor: number;
  discountBasisPoints: number;
};
```

## CalculationResult

```ts
type CalculationResult = {
  items: CalculationLineResult[];
  subtotalMinor: number;
  overallDiscountMinor: number;
  amountAfterDiscountMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: "RUB";
  calculationVersion: string;
};
```

## CalculationLineResult

```ts
type CalculationLineResult = {
  itemId: string;
  lineGrossMinor: number;
  lineDiscountMinor: number;
  lineTotalMinor: number;
};
```

## Constraints

- `projectName`: не более 120 символов.
- `client.displayName`: не более 120 символов.
- `client.contactNote`: не более 300 символов.
- `items[].name`: не более 160 символов.
- `items[].description`: не более 1000 символов.
- `items[].unit`: не более 30 символов.
- `comment`: не более 2000 символов.
- `items`: максимум 100 позиций.
- Отрицательные денежные значения запрещены.
- Пустые строки нормализуются предсказуемо.
- Неизвестные поля импортируемого JSON не должны молча становиться частью доверенной модели.
- `schemaVersion` обязателен для JSON import/export.

## Draft storage

Черновики в `localStorage` должны:

- храниться под версионированным ключом `quoteflow:drafts:v1`;
- поддерживать удаление отдельного draft;
- поддерживать полную очистку;
- не синхронизироваться с backend;
- не позиционироваться как надежное долгосрочное хранилище;
- не содержать реальные персональные или конфиденциальные данные.

## Версионирование

`schemaVersion` и `calculationVersion` нужны для явного контроля изменений модели. При изменении структуры JSON import/export должна появляться стратегия migration или понятная ошибка несовместимости.
