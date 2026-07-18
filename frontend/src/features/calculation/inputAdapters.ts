import { calculateQuote } from "./calculate";
import { CalculationError } from "./errors";
import type { EditableDraft } from "./editableTypes";
import type { CalculationResult, QuoteCalculationInput } from "./types";

const MAX_UNIT_PRICE_MINOR = 1_000_000_000_000n;
const moneyPattern = /^(0|[1-9]\d*)([.,]\d{1,2})?$/;
const percentPattern = /^(0|[1-9]\d?|100)([.,]\d{1,2})?$/;
const quantityPattern = /^(0|[1-9]\d*)([.,]\d{1,3})?$/;

export type FieldErrors = Record<string, string>;

export type DraftEvaluation =
  | {
      ok: true;
      input: QuoteCalculationInput;
      result: CalculationResult;
      fieldErrors: FieldErrors;
      message?: string;
    }
  | {
      ok: false;
      fieldErrors: FieldErrors;
      message: string;
      reason: "incomplete" | "invalid" | "calculation";
    };

export function evaluateDraft(draft: EditableDraft): DraftEvaluation {
  const converted = draftToCalculationInput(draft);
  if (!converted.ok) {
    return converted;
  }

  try {
    return {
      ok: true,
      input: converted.input,
      result: calculateQuote(converted.input),
      fieldErrors: {}
    };
  } catch (error) {
    return {
      ok: false,
      fieldErrors: mapCalculationError(error),
      message: "Расчёт не выполнен. Проверьте отмеченные поля.",
      reason: "calculation"
    };
  }
}

export function draftToCalculationInput(
  draft: EditableDraft
):
  | { ok: true; input: QuoteCalculationInput }
  | { ok: false; fieldErrors: FieldErrors; message: string; reason: "incomplete" | "invalid" } {
  const errors: FieldErrors = {};

  const projectName = draft.projectName.trim();
  const clientDisplayName = draft.clientDisplayName.trim();
  const clientContactNote = draft.clientContactNote.trim();
  const comment = draft.comment.trim();

  addLengthError(errors, "projectName", projectName, 120, "Название проекта не длиннее 120 символов");
  addLengthError(
    errors,
    "clientDisplayName",
    clientDisplayName,
    120,
    "Имя клиента не длиннее 120 символов"
  );
  addLengthError(
    errors,
    "clientContactNote",
    clientContactNote,
    300,
    "Заметка о клиенте не длиннее 300 символов"
  );
  addLengthError(errors, "comment", comment, 2000, "Комментарий не длиннее 2000 символов");

  if (draft.items.length > 100) {
    errors.items = "В расчёте может быть не более 100 позиций";
  }

  const items = draft.items.map((item, index) => {
    const prefix = `items.${item.id}`;
    const name = item.name.trim();
    const unit = item.unit.trim();
    const description = item.description.trim();
    const quantity = parseQuantityText(item.quantityText, `${prefix}.quantityText`);
    const unitPriceMinor = parseMoneyToMinor(
      item.unitPriceRublesText,
      `${prefix}.unitPriceRublesText`
    );
    const discountBasisPoints = parsePercentToBasisPoints(
      item.discountPercentText,
      `${prefix}.discountPercentText`
    );

    if (!name) {
      errors[`${prefix}.name`] = "Укажите название позиции";
    } else {
      addLengthError(errors, `${prefix}.name`, name, 160, "Название позиции не длиннее 160 символов");
    }
    addLengthError(
      errors,
      `${prefix}.description`,
      description,
      1000,
      "Описание не длиннее 1000 символов"
    );
    if (!unit) {
      errors[`${prefix}.unit`] = "Укажите единицу";
    } else {
      addLengthError(errors, `${prefix}.unit`, unit, 30, "Единица не длиннее 30 символов");
    }
    if (!quantity.ok) {
      errors[`${prefix}.quantityText`] = quantity.message;
    }
    if (!unitPriceMinor.ok) {
      errors[`${prefix}.unitPriceRublesText`] = unitPriceMinor.message;
    }
    if (!discountBasisPoints.ok) {
      errors[`${prefix}.discountPercentText`] = discountBasisPoints.message;
    }

    return {
      id: item.id || `item-${index + 1}`,
      name,
      description,
      quantity: quantity.ok ? quantity.value : "",
      unit,
      unitPriceMinor: unitPriceMinor.ok ? unitPriceMinor.value : 0,
      discountBasisPoints: discountBasisPoints.ok ? discountBasisPoints.value : 0
    };
  });

  const overallDiscount = parsePercentToBasisPoints(
    draft.overallDiscountPercentText,
    "overallDiscountPercentText"
  );
  let overallDiscountBasisPoints = 0;
  if (!overallDiscount.ok) {
    errors.overallDiscountPercentText = overallDiscount.message;
  } else {
    overallDiscountBasisPoints = overallDiscount.value;
  }

  let taxBasisPoints = 0;
  if (draft.taxMode === "custom") {
    const taxRate = parsePercentToBasisPoints(draft.taxRatePercentText, "taxRatePercentText");
    if (!taxRate.ok) {
      errors.taxRatePercentText = taxRate.message;
    } else {
      taxBasisPoints = taxRate.value;
    }
  }

  const hasIncomplete = Object.values(errors).some(
    (message) => message.includes("Заполните") || message.includes("Укажите")
  );
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      fieldErrors: errors,
      message: hasIncomplete
        ? "Заполните обязательные поля, чтобы увидеть итог."
        : "Проверьте значения в отмеченных полях.",
      reason: hasIncomplete ? "incomplete" : "invalid"
    };
  }

  return {
    ok: true,
    input: {
      schemaVersion: "1",
      projectName,
      client: {
        displayName: clientDisplayName,
        contactNote: clientContactNote
      },
      items,
      overallDiscountBasisPoints,
      taxBasisPoints,
      comment,
      currency: "RUB"
    }
  };
}

export function parseMoneyToMinor(
  text: string,
  _field = "money"
): { ok: true; value: number } | { ok: false; message: string } {
  const normalized = text.trim().replace(",", ".");
  if (!normalized) {
    return { ok: false, message: "Введите корректную цену" };
  }
  if (normalized.startsWith("-") || !moneyPattern.test(normalized)) {
    return { ok: false, message: "Введите корректную цену" };
  }
  const [rubles, kopecks = ""] = normalized.split(".");
  const minor = BigInt(rubles) * 100n + BigInt(kopecks.padEnd(2, "0"));
  if (minor > MAX_UNIT_PRICE_MINOR) {
    return { ok: false, message: "Цена превышает допустимый лимит" };
  }
  return { ok: true, value: Number(minor) };
}

export function parsePercentToBasisPoints(
  text: string,
  _field = "percent"
): { ok: true; value: number } | { ok: false; message: string } {
  const normalized = text.trim().replace(",", ".");
  if (!normalized || normalized.startsWith("-") || !percentPattern.test(normalized)) {
    return { ok: false, message: "Скидка должна быть от 0 до 100%" };
  }
  const [whole, fraction = ""] = normalized.split(".");
  const basisPoints = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (basisPoints > 10000n) {
    return { ok: false, message: "Скидка должна быть от 0 до 100%" };
  }
  return { ok: true, value: Number(basisPoints) };
}

function parseQuantityText(
  text: string,
  _field: string
): { ok: true; value: string } | { ok: false; message: string } {
  const normalized = text.trim().replace(",", ".");
  if (!normalized) {
    return { ok: false, message: "Заполните количество" };
  }
  if (normalized.startsWith("-") || !quantityPattern.test(normalized)) {
    if (/^[0-9]+[.,][0-9]{4,}$/.test(normalized)) {
      return { ok: false, message: "Используйте не более трёх знаков после запятой" };
    }
    return { ok: false, message: "Количество должно быть больше нуля" };
  }
  const [whole, fraction = ""] = normalized.split(".");
  const quantityMilli = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
  if (quantityMilli < 1n) {
    return { ok: false, message: "Количество должно быть больше нуля" };
  }
  if (quantityMilli > 1_000_000_000n) {
    return { ok: false, message: "Количество превышает допустимый лимит" };
  }
  return { ok: true, value: fraction ? `${whole}.${fraction}` : whole };
}

function addLengthError(
  errors: FieldErrors,
  key: string,
  value: string,
  max: number,
  message: string
) {
  if (Array.from(value).length > max) {
    errors[key] = message;
  }
}

function mapCalculationError(error: unknown): FieldErrors {
  if (!(error instanceof CalculationError) || !error.path) {
    return {};
  }
  const path = error.path.replace(/items\[(\d+)\]/, "items.$1");
  return { [path]: "Значение не прошло строгую проверку расчёта" };
}

export function formatMoney(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new RangeError("Money minor units must be a non-negative safe integer");
  }

  const minorUnits = BigInt(minor);
  const rubles = minorUnits / 100n;
  const kopecks = (minorUnits % 100n).toString().padStart(2, "0");
  const parts = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB"
  }).formatToParts(rubles);

  return parts
    .map((part) => (part.type === "fraction" ? kopecks : part.value))
    .join("");
}
