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

## EditableDraft

UI использует отдельную модель черновика со строковыми значениями, которые могут быть пустыми или промежуточными:

```ts
type EditableDraft = {
  storageVersion: "1";
  id: string;
  projectName: string;
  clientDisplayName: string;
  clientContactNote: string;
  comment: string;
  items: EditableItem[];
  overallDiscountPercentText: string;
  taxMode: "none" | "custom";
  taxRatePercentText: string;
  createdAt: string;
  updatedAt: string;
};

type EditableItem = {
  id: string;
  name: string;
  description: string;
  quantityText: string;
  unit: string;
  unitPriceRublesText: string;
  discountPercentText: string;
};
```

Перед calculation, export, preview или PDF editable draft должен быть нормализован в `QuoteCalculationInput`. Сохранение локального draft не требует прохождения строгой calculation schema.

## Supporting strict types

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
- неизвестные strict-input поля отклоняются;
- повторяющиеся item IDs в strict input отклоняются;
- итоговые суммы никогда не принимаются во входной модели.

## Normalization

- пользовательские строки trim-ятся на границе strict input;
- пустые optional strings становятся `""`;
- ruble strings преобразуются в integer kopecks без floating point;
- percent strings преобразуются в basis points без floating point;
- quantity преобразуется в каноническую десятичную строку;
- запятая в UI принимается и нормализуется в точку;
- scientific notation и лишняя precision отклоняются;
- порядок items сохраняется;
- несовместимые версии storage/import не мигрируют молча.

## Calculation export envelope

JSON import/export использует отдельный versioned envelope:

```ts
type CalculationExportEnvelope = {
  exportVersion: "1";
  type: "quoteflow-calculation";
  calculation: QuoteCalculationInput;
};
```

Envelope содержит только три указанных поля. Он не включает `EditableDraft`, storage metadata, timestamps, request ID или calculated totals. Import не принимает raw `QuoteCalculationInput` без envelope и не выполняет молчаливую миграцию других версий.

После успешного import создаётся новый `EditableDraft` с новым ID и timestamps; порядок и IDs позиций сохраняются, а minor units и basis points преобразуются обратно в exact decimal strings через integer arithmetic.

## CSV export model

CSV содержит позиции валидного расчёта в фиксированном порядке колонок:

```text
item_id,name,description,quantity,unit,unit_price_rub,discount_percent,line_gross_rub,line_discount_rub,line_total_rub,currency
```

Money и percent values представлены точными decimal strings без locale separators. CSV не является входной моделью и обратно не импортируется.

## Draft storage envelope

Ключ:

```text
quoteflow:drafts:v1
```

Формат:

```ts
type DraftEnvelope = {
  storageVersion: "1";
  drafts: EditableDraft[];
};
```

Реализованы список, сохранение/upsert, открытие, удаление одного draft и полная очистка только ключа QuoteFlow. Storage exceptions перехватываются, некорректный JSON не приводит к падению UI, а структурно некорректные drafts пропускаются с предупреждением.

Хранилище не синхронизируется с backend и не считается долговременным или конфиденциальным.
