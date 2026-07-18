# 03. Расчетная модель

## Валюта и денежные значения

Основная валюта MVP: `RUB`.

Денежные значения хранятся целыми числами в копейках. Форматированные рубли используются только в UI и документах.

## Quantity

`quantity`:

- передается как десятичная строка;
- имеет максимальную точность 3 знака после запятой;
- имеет минимальное положительное значение `0.001`;
- имеет максимальное значение `1000000`.

Обычный JavaScript `number` не является источником истины для расчетов.

## Rates

Скидки и налог хранятся в basis points:

- `100` basis points = 1%;
- `10000` basis points = 100%;
- допустимый диапазон скидок: от `0` до `10000`;
- допустимый диапазон налоговой ставки: от `0` до `10000`;
- значение `0` означает отсутствие скидки или налога.

Для процентных операций ставка делится на `10000`.

## Округление

Денежные результаты округляются до копейки по правилу `ROUND_HALF_UP`. Это правило должно одинаково выполняться во frontend и backend. Backend является финальной точкой проверки перед PDF generation.

## Порядок расчета

1. `lineGross = round(quantity * unitPrice)`
2. `lineDiscount = round(lineGross * lineDiscountRate)`
3. `lineTotal = lineGross - lineDiscount`
4. `subtotal = sum(lineTotal)`
5. `overallDiscount = round(subtotal * overallDiscountRate)`
6. `amountAfterDiscount = subtotal - overallDiscount`
7. `taxAmount = round(amountAfterDiscount * taxRate)`
8. `total = amountAfterDiscount + taxAmount`

Все денежные результаты в этой последовательности выражены в minor units.

## Состояния расчета

Важно различать:

- неполный draft, который можно временно хранить в `localStorage`;
- валидный расчет, который разрешено экспортировать или отправлять в backend;
- валидный расчет, для которого разрешено формировать PDF.

Неполный draft может содержать пустые поля и промежуточные значения UI. Он не должен считаться готовым расчетом.

## Примеры для будущих fixtures

### 1. Обычная позиция без скидки и налога

Input:

- `quantity`: `2`;
- `unitPriceMinor`: `150000`;
- `discountBasisPoints`: `0`;
- `overallDiscountBasisPoints`: `0`;
- `taxBasisPoints`: `0`.

Expected:

- `lineGross`: `300000`;
- `lineDiscount`: `0`;
- `lineTotal`: `300000`;
- `subtotal`: `300000`;
- `total`: `300000`.

### 2. Позиция с дробным количеством

Input:

- `quantity`: `1.5`;
- `unitPriceMinor`: `100000`;
- `discountBasisPoints`: `0`.

Expected:

- `lineGross`: `150000`;
- `lineDiscount`: `0`;
- `lineTotal`: `150000`.

### 3. Скидка позиции

Input:

- `quantity`: `1`;
- `unitPriceMinor`: `100000`;
- `discountBasisPoints`: `1500`.

Expected:

- `lineGross`: `100000`;
- `lineDiscount`: `15000`;
- `lineTotal`: `85000`.

### 4. Общая скидка

Input:

- `subtotal`: `200000`;
- `overallDiscountBasisPoints`: `1000`.

Expected:

- `overallDiscount`: `20000`;
- `amountAfterDiscount`: `180000`.

### 5. Налог после общей скидки

Input:

- `amountAfterDiscount`: `180000`;
- `taxBasisPoints`: `2000`.

Expected:

- `taxAmount`: `36000`;
- `total`: `216000`.

### 6. Проверка `ROUND_HALF_UP`

Input:

- `quantity`: `1`;
- `unitPriceMinor`: `1`;
- `discountBasisPoints`: `5000`.

Expected:

- `lineGross`: `1`;
- `lineDiscount`: `1`;
- `lineTotal`: `0`.

Половина копейки округляется вверх.

### 7. Несколько позиций

Input:

- item A `lineTotal`: `100000`;
- item B `lineTotal`: `250000`;
- item C `lineTotal`: `50000`.

Expected:

- `subtotal`: `400000`.

### 8. Скидка 100%

Input:

- `lineGross`: `100000`;
- `discountBasisPoints`: `10000`.

Expected:

- `lineDiscount`: `100000`;
- `lineTotal`: `0`.

### 9. Пустой draft

Пустой draft может существовать в `localStorage`, но не является валидным расчетом для export, backend preview или PDF generation.

### 10. Некорректные отрицательные значения

Отрицательные `quantity`, `unitPriceMinor`, `discountBasisPoints` или `taxBasisPoints` должны приводить к validation error.
