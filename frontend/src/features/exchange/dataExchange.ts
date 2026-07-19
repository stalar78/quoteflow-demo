import { calculateQuote } from "../calculation/calculate";
import { CalculationError } from "../calculation/errors";
import { createId, type EditableDraft, type EditableItem } from "../calculation/editableTypes";
import type {
  CalculationResult,
  QuoteCalculationInput,
  QuoteItem
} from "../calculation/types";

export const JSON_EXPORT_FILENAME = "quoteflow-calculation.json";
export const CSV_EXPORT_FILENAME = "quoteflow-items.csv";
export const MAX_IMPORT_BYTES = 256 * 1024;

export type CalculationExportEnvelope = {
  exportVersion: "1";
  type: "quoteflow-calculation";
  calculation: QuoteCalculationInput;
};

export type ImportResult =
  | { ok: true; draft: EditableDraft; input: QuoteCalculationInput }
  | { ok: false; message: string };

const ENVELOPE_KEYS = new Set(["exportVersion", "type", "calculation"]);

export function createExportEnvelope(input: QuoteCalculationInput): CalculationExportEnvelope {
  calculateQuote(input);
  return {
    exportVersion: "1",
    type: "quoteflow-calculation",
    calculation: input
  };
}

export function serializeCalculationEnvelope(input: QuoteCalculationInput): string {
  return `${JSON.stringify(createExportEnvelope(input), null, 2)}\n`;
}

export function downloadTextFile(text: string, filename: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function importCalculationFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, message: "Файл больше 256 КиБ." };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, message: "Не удалось прочитать файл." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "Файл не является корректным JSON." };
  }

  const envelope = parseEnvelope(parsed);
  if (!envelope.ok) {
    return envelope;
  }

  try {
    calculateQuote(envelope.input);
  } catch (error) {
    return { ok: false, message: importErrorMessage(error) };
  }

  return {
    ok: true,
    draft: calculationInputToDraft(envelope.input),
    input: envelope.input
  };
}

function parseEnvelope(value: unknown): { ok: true; input: QuoteCalculationInput } | ImportResult {
  if (!isPlainObject(value)) {
    return { ok: false, message: "Ожидается объект export envelope." };
  }
  for (const key of Object.keys(value)) {
    if (!ENVELOPE_KEYS.has(key)) {
      return { ok: false, message: "Файл содержит неизвестные поля export envelope." };
    }
  }
  if (value.exportVersion !== "1") {
    return { ok: false, message: "Версия экспорта не поддерживается." };
  }
  if (value.type !== "quoteflow-calculation") {
    return { ok: false, message: "Тип файла не поддерживается." };
  }
  if (!("calculation" in value)) {
    return { ok: false, message: "В файле нет расчёта." };
  }
  return { ok: true, input: value.calculation as QuoteCalculationInput };
}

export function calculationInputToDraft(
  input: QuoteCalculationInput,
  now = new Date().toISOString()
): EditableDraft {
  return {
    storageVersion: "1",
    id: createId(),
    projectName: input.projectName,
    clientDisplayName: input.client.displayName,
    clientContactNote: input.client.contactNote,
    comment: input.comment,
    items: input.items.map(inputItemToEditableItem),
    overallDiscountPercentText: basisPointsToDecimalString(input.overallDiscountBasisPoints),
    taxMode: input.taxBasisPoints === 0 ? "none" : "custom",
    taxRatePercentText: basisPointsToDecimalString(input.taxBasisPoints),
    createdAt: now,
    updatedAt: now
  };
}

function inputItemToEditableItem(item: QuoteItem): EditableItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    quantityText: item.quantity,
    unit: item.unit,
    unitPriceRublesText: minorToDecimalString(item.unitPriceMinor),
    discountPercentText: basisPointsToDecimalString(item.discountBasisPoints)
  };
}

export function serializeItemsCsv(
  input: QuoteCalculationInput,
  result: CalculationResult
): string {
  const lineById = new Map(result.items.map((line) => [line.itemId, line]));
  const rows = [
    [
      "item_id",
      "name",
      "description",
      "quantity",
      "unit",
      "unit_price_rub",
      "discount_percent",
      "line_gross_rub",
      "line_discount_rub",
      "line_total_rub",
      "currency"
    ],
    ...input.items.map((item) => {
      const line = lineById.get(item.id);
      if (!line) {
        throw new Error("Missing calculated line");
      }
      return [
        protectCsvText(item.id),
        protectCsvText(item.name),
        protectCsvText(item.description),
        item.quantity,
        protectCsvText(item.unit),
        minorToDecimalString(item.unitPriceMinor),
        basisPointsToDecimalString(item.discountBasisPoints),
        minorToDecimalString(line.lineGrossMinor),
        minorToDecimalString(line.lineDiscountMinor),
        minorToDecimalString(line.lineTotalMinor),
        input.currency
      ];
    })
  ];

  return `\uFEFF${rows.map((row) => row.map(quoteCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function minorToDecimalString(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new RangeError("Minor units must be a non-negative safe integer");
  }
  const value = BigInt(minor);
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function basisPointsToDecimalString(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    throw new RangeError("Basis points must be 0..10000");
  }
  const basisPoints = BigInt(value);
  const whole = basisPoints / 100n;
  const fraction = basisPoints % 100n;
  return fraction === 0n
    ? whole.toString()
    : `${whole}.${fraction.toString().padStart(2, "0")}`;
}

function protectCsvText(value: string): string {
  if (value.startsWith("\t") || value.startsWith("\r")) {
    return `'${value}`;
  }
  const trimmedStart = value.trimStart();
  return /^[=+\-@]/.test(trimmedStart) ? `'${value}` : value;
}

function quoteCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function importErrorMessage(error: unknown): string {
  if (error instanceof CalculationError) {
    return "Файл не прошёл строгую проверку расчёта.";
  }
  return "Файл содержит некорректные данные.";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
