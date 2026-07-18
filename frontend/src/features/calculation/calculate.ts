import { CalculationError, type CalculationErrorCode } from "./errors";
import type {
  CalculationLineResult,
  CalculationResult,
  QuoteCalculationInput,
  QuoteItem
} from "./types";

const SCHEMA_VERSION = "1";
const CURRENCY = "RUB";
const CALCULATION_VERSION = "1";
const MAX_ITEMS = 100;
const MAX_UNIT_PRICE_MINOR = 1_000_000_000_000;
const MAX_SAFE_MINOR = 9_000_000_000_000_000n;
const QUANTITY_PATTERN = /^(0|[1-9]\d*)(\.\d{1,3})?$/;
const QUANTITY_MIN_MILLI = 1n;
const QUANTITY_MAX_MILLI = 1_000_000_000n;

const INPUT_KEYS = new Set([
  "schemaVersion",
  "projectName",
  "client",
  "items",
  "overallDiscountBasisPoints",
  "taxBasisPoints",
  "comment",
  "currency"
]);
const CLIENT_KEYS = new Set(["displayName", "contactNote"]);
const ITEM_KEYS = new Set([
  "id",
  "name",
  "description",
  "quantity",
  "unit",
  "unitPriceMinor",
  "discountBasisPoints"
]);

export function calculateQuote(input: QuoteCalculationInput): CalculationResult {
  validateInput(input);

  const seenIds = new Set<string>();
  const items: CalculationLineResult[] = [];
  let subtotal = 0n;

  input.items.forEach((item, index) => {
    validateItem(item, index);
    if (seenIds.has(item.id)) {
      throw new CalculationError(
        "DUPLICATE_ITEM_ID",
        "Item IDs must be unique",
        `items[${index}].id`
      );
    }
    seenIds.add(item.id);

    const quantityMilli = parseQuantity(item.quantity, `items[${index}].quantity`);
    const unitPriceMinor = BigInt(item.unitPriceMinor);
    const discountBasisPoints = BigInt(item.discountBasisPoints);

    const lineGross = assertSafeMinor(
      roundHalfUp(quantityMilli * unitPriceMinor, 1000n),
      "items"
    );
    const lineDiscount = assertSafeMinor(
      roundHalfUp(lineGross * discountBasisPoints, 10000n),
      "items"
    );
    const lineTotal = assertSafeMinor(lineGross - lineDiscount, "items");

    subtotal = assertSafeMinor(subtotal + lineTotal, "subtotalMinor");
    items.push({
      itemId: item.id,
      lineGrossMinor: toJsonSafeInteger(lineGross),
      lineDiscountMinor: toJsonSafeInteger(lineDiscount),
      lineTotalMinor: toJsonSafeInteger(lineTotal)
    });
  });

  const overallDiscount = assertSafeMinor(
    roundHalfUp(subtotal * BigInt(input.overallDiscountBasisPoints), 10000n),
    "overallDiscountMinor"
  );
  const amountAfterDiscount = assertSafeMinor(
    subtotal - overallDiscount,
    "amountAfterDiscountMinor"
  );
  const tax = assertSafeMinor(
    roundHalfUp(amountAfterDiscount * BigInt(input.taxBasisPoints), 10000n),
    "taxMinor"
  );
  const total = assertSafeMinor(amountAfterDiscount + tax, "totalMinor");

  return {
    items,
    subtotalMinor: toJsonSafeInteger(subtotal),
    overallDiscountMinor: toJsonSafeInteger(overallDiscount),
    amountAfterDiscountMinor: toJsonSafeInteger(amountAfterDiscount),
    taxMinor: toJsonSafeInteger(tax),
    totalMinor: toJsonSafeInteger(total),
    currency: CURRENCY,
    calculationVersion: CALCULATION_VERSION
  };
}

export function parseQuantity(quantity: string, path = "quantity"): bigint {
  if (typeof quantity !== "string" || !QUANTITY_PATTERN.test(quantity)) {
    throw new CalculationError(
      "INVALID_QUANTITY",
      "Quantity must be a canonical decimal string with up to three decimal places",
      path
    );
  }

  const [wholePart, fractionalPart = ""] = quantity.split(".");
  const quantityMilli =
    BigInt(wholePart) * 1000n + BigInt(fractionalPart.padEnd(3, "0"));

  if (
    quantityMilli < QUANTITY_MIN_MILLI ||
    quantityMilli > QUANTITY_MAX_MILLI
  ) {
    throw new CalculationError(
      "INVALID_QUANTITY",
      "Quantity must be between 0.001 and 1000000",
      path
    );
  }

  return quantityMilli;
}

function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

function validateInput(input: QuoteCalculationInput): void {
  assertPlainObject(input, "input", "UNEXPECTED_FIELD");
  assertNoUnexpectedKeys(input, INPUT_KEYS, "");

  if (input.schemaVersion !== SCHEMA_VERSION) {
    throw new CalculationError(
      "UNSUPPORTED_SCHEMA_VERSION",
      "Only schemaVersion 1 is supported",
      "schemaVersion"
    );
  }
  if (input.currency !== CURRENCY) {
    throw new CalculationError("INVALID_CURRENCY", "Currency must be RUB", "currency");
  }
  assertStringLength(input.projectName, 0, 120, "INVALID_PROJECT_NAME", "projectName");
  assertPlainObject(input.client, "client", "INVALID_CLIENT");
  assertNoUnexpectedKeys(input.client, CLIENT_KEYS, "client");
  assertStringLength(
    input.client.displayName,
    0,
    120,
    "INVALID_CLIENT",
    "client.displayName"
  );
  assertStringLength(
    input.client.contactNote,
    0,
    300,
    "INVALID_CLIENT",
    "client.contactNote"
  );

  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > MAX_ITEMS) {
    throw new CalculationError(
      "INVALID_ITEMS",
      "Items must contain between 1 and 100 entries",
      "items"
    );
  }

  assertBasisPoints(input.overallDiscountBasisPoints, "overallDiscountBasisPoints");
  assertBasisPoints(input.taxBasisPoints, "taxBasisPoints");
  assertStringLength(input.comment, 0, 2000, "INVALID_COMMENT", "comment");
}

function validateItem(item: QuoteItem, index: number): void {
  const path = `items[${index}]`;
  assertPlainObject(item, path, "UNEXPECTED_FIELD");
  assertNoUnexpectedKeys(item, ITEM_KEYS, path);
  assertStringLength(item.id, 1, 64, "INVALID_ITEM_ID", `${path}.id`);
  if (item.id.trim() === "") {
    throw new CalculationError("INVALID_ITEM_ID", "Item ID must not be blank", `${path}.id`);
  }
  assertStringLength(item.name, 1, 160, "INVALID_ITEM_NAME", `${path}.name`, true);
  assertStringLength(
    item.description,
    0,
    1000,
    "INVALID_ITEM_DESCRIPTION",
    `${path}.description`
  );
  parseQuantity(item.quantity, `${path}.quantity`);
  assertStringLength(item.unit, 1, 30, "INVALID_UNIT", `${path}.unit`, true);
  assertIntegerRange(
    item.unitPriceMinor,
    0,
    MAX_UNIT_PRICE_MINOR,
    "INVALID_MONEY",
    `${path}.unitPriceMinor`
  );
  assertBasisPoints(item.discountBasisPoints, `${path}.discountBasisPoints`);
}

function assertPlainObject(
  value: unknown,
  path: string,
  code: CalculationErrorCode
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CalculationError(code, "Expected an object", path);
  }
}

function assertNoUnexpectedKeys(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  path: string
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new CalculationError(
        "UNEXPECTED_FIELD",
        "Unexpected input field",
        path ? `${path}.${key}` : key
      );
    }
  }
}

function assertStringLength(
  value: unknown,
  min: number,
  max: number,
  code: CalculationErrorCode,
  path: string,
  trim = false
): void {
  if (typeof value !== "string") {
    throw new CalculationError(code, "Expected a string", path);
  }
  const measured = trim ? value.trim() : value;
  const codePointLength = Array.from(measured).length;
  if (codePointLength < min || codePointLength > max) {
    throw new CalculationError(code, `String length must be ${min}-${max}`, path);
  }
}

function assertBasisPoints(value: unknown, path: string): void {
  assertIntegerRange(value, 0, 10000, "INVALID_BASIS_POINTS", path);
}

function assertIntegerRange(
  value: unknown,
  min: number,
  max: number,
  code: CalculationErrorCode,
  path: string
): void {
  if (!Number.isInteger(value) || typeof value !== "number" || value < min || value > max) {
    throw new CalculationError(code, `Expected an integer from ${min} to ${max}`, path);
  }
}

function assertSafeMinor(value: bigint, path: string): bigint {
  if (value < 0n || value > MAX_SAFE_MINOR) {
    throw new CalculationError(
      "CALCULATION_LIMIT_EXCEEDED",
      "Calculation result exceeds the safe minor-unit limit",
      path
    );
  }
  return value;
}

function toJsonSafeInteger(value: bigint): number {
  assertSafeMinor(value, "result");
  return Number(value);
}
