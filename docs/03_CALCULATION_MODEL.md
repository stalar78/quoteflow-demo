# 03. Расчётная модель

## Версия и валюта

- `calculationVersion`: `"1"`.
- Валюта MVP: `RUB`.
- Денежные значения на границах модели выражаются целыми числами в копейках.
- Форматированные рубли используются только в UI и документах.
- Floating-point арифметика не используется как источник истины.

## Quantity

`quantity` передаётся канонической десятичной строкой:

- формат: `^(0|[1-9]\d*)(\.\d{1,3})?$`;
- для валидного расчёта значение от `0.001` до `1000000`;
- scientific notation, знак `+`, запятая и лишние нули перед целой частью запрещены;
- UI может временно хранить невалидную строку только внутри draft state.

Для расчёта строка преобразуется в целое `quantityMilli` с масштабом 1000. Например, `"1.5"` становится `1500`.

## Money and rates

- `unitPriceMinor`: целое число от `0` до `1_000_000_000_000`.
- Скидки и налог — целые basis points от `0` до `10000`.
- `100` basis points = 1%; `10000` = 100%.
- `0` означает отсутствие скидки или налога.
- Все промежуточные и итоговые значения должны быть неотрицательными и не превышать `MAX_SAFE_MINOR = 9_000_000_000_000_000`.
- Выход за лимит приводит к `CALCULATION_LIMIT_EXCEEDED`, а не к потере точности.

Frontend выполняет целочисленную арифметику через `bigint` или эквивалентный exact-integer механизм. Backend использует Python `int`. После проверки лимита результат сериализуется как JSON integer.

## ROUND_HALF_UP для неотрицательных чисел

Для целых `numerator >= 0` и `denominator > 0`:

`roundHalfUp(numerator, denominator) = (numerator + floor(denominator / 2)) // denominator`

Применение:

- line gross: denominator `1000`;
- скидки и налог: denominator `10000`.

## Порядок расчёта

Для каждой позиции:

1. `quantityMilli = parseQuantity(quantity)`
2. `lineGrossMinor = roundHalfUp(quantityMilli * unitPriceMinor, 1000)`
3. `lineDiscountMinor = roundHalfUp(lineGrossMinor * discountBasisPoints, 10000)`
4. `lineTotalMinor = lineGrossMinor - lineDiscountMinor`

Для всего расчёта:

5. `subtotalMinor = sum(lineTotalMinor)`
6. `overallDiscountMinor = roundHalfUp(subtotalMinor * overallDiscountBasisPoints, 10000)`
7. `amountAfterDiscountMinor = subtotalMinor - overallDiscountMinor`
8. `taxMinor = roundHalfUp(amountAfterDiscountMinor * taxBasisPoints, 10000)`
9. `totalMinor = amountAfterDiscountMinor + taxMinor`

Округление выполняется только в явно перечисленных точках. Backend повторяет расчёт самостоятельно и является окончательной точкой проверки перед PDF generation.

## Golden fixtures

Обязательные сценарии:

| Сценарий | Input | Expected |
|---|---|---|
| Без скидки | quantity `2`, price `150000` | gross/total `300000` |
| Дробное количество | quantity `1.5`, price `100000` | gross `150000` |
| Округление gross | quantity `0.5`, price `1` | gross `1` |
| Скидка позиции | gross `100000`, rate `1500` | discount `15000`, total `85000` |
| Half-up скидки | gross `1`, rate `5000` | discount `1`, total `0` |
| Общая скидка | subtotal `200000`, rate `1000` | discount `20000`, after `180000` |
| Налог после скидки | after `180000`, rate `2000` | tax `36000`, total `216000` |
| Скидка 100% | gross `100000`, rate `10000` | total `0` |
| Несколько позиций | totals `100000,250000,50000` | subtotal `400000` |

Также обязательны invalid fixtures: пустой массив, отрицательные значения, дробные basis points, malformed quantity, более трёх знаков после запятой, более 100 позиций, неизвестная `schemaVersion` и превышение `MAX_SAFE_MINOR`.

## Состояния

Неполный draft разрешено хранить в `localStorage`. Для calculation preview требуется минимум одна полностью валидная позиция. Для PDF дополнительно требуется непустой `projectName`. Невалидные входные данные не должны давать частично доверенный итог.
