import type { CalculationResult, QuoteCalculationInput } from "../calculation/types";

export type PreviewSuccess = {
  requestId: string;
  calculation: CalculationResult;
};

export type PreviewClientResult =
  | { ok: true; data: PreviewSuccess }
  | { ok: false; message: string; requestId?: string };

type PreviewClientError = Extract<PreviewClientResult, { ok: false }>;

const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_SAFE_MINOR = 9_000_000_000_000_000;
const SUCCESS_KEYS = new Set(["requestId", "calculation"]);
const RESULT_KEYS = new Set([
  "items",
  "subtotalMinor",
  "overallDiscountMinor",
  "amountAfterDiscountMinor",
  "taxMinor",
  "totalMinor",
  "currency",
  "calculationVersion"
]);
const LINE_KEYS = new Set(["itemId", "lineGrossMinor", "lineDiscountMinor", "lineTotalMinor"]);

export async function postCalculationPreview(
  input: QuoteCalculationInput,
  signal: AbortSignal,
  requestId = createClientRequestId()
): Promise<PreviewClientResult> {
  let response: Response;
  try {
    response = await fetch("/api/v1/calculations/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId
      },
      body: JSON.stringify(input),
      signal
    });
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      return { ok: false, message: "Запрос отменён." };
    }
    return { ok: false, message: "Не удалось связаться с API." };
  }

  const parsed = await parseJsonResponse(response);
  if (!parsed.ok) {
    return parsed;
  }

  if (!response.ok) {
    return parseErrorEnvelope(parsed.value, response.status);
  }

  return parsePreviewSuccess(parsed.value);
}

export function createClientRequestId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `ui-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function resultsMatch(local: CalculationResult, remote: CalculationResult): boolean {
  if (
    local.subtotalMinor !== remote.subtotalMinor ||
    local.overallDiscountMinor !== remote.overallDiscountMinor ||
    local.amountAfterDiscountMinor !== remote.amountAfterDiscountMinor ||
    local.taxMinor !== remote.taxMinor ||
    local.totalMinor !== remote.totalMinor ||
    local.currency !== remote.currency ||
    local.calculationVersion !== remote.calculationVersion ||
    local.items.length !== remote.items.length
  ) {
    return false;
  }

  return local.items.every((line, index) => {
    const other = remote.items[index];
    return (
      other &&
      line.itemId === other.itemId &&
      line.lineGrossMinor === other.lineGrossMinor &&
      line.lineDiscountMinor === other.lineDiscountMinor &&
      line.lineTotalMinor === other.lineTotalMinor
    );
  });
}

function parsePreviewSuccess(value: unknown): PreviewClientResult {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, SUCCESS_KEYS) ||
    typeof value.requestId !== "string" ||
    !SAFE_REQUEST_ID.test(value.requestId)
  ) {
    return { ok: false, message: "API вернул некорректный ответ." };
  }
  if (!isCalculationResult(value.calculation)) {
    return { ok: false, message: "API вернул некорректный расчёт." };
  }
  return { ok: true, data: { requestId: value.requestId, calculation: value.calculation } };
}

async function parseJsonResponse(
  response: Response
): Promise<{ ok: true; value: unknown } | PreviewClientError> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, message: "API вернул ответ не в JSON." };
  }
  try {
    return { ok: true, value: await response.json() };
  } catch {
    return { ok: false, message: "API вернул повреждённый JSON." };
  }
}

function parseErrorEnvelope(value: unknown, status: number): PreviewClientResult {
  if (
    isPlainObject(value) &&
    typeof value.requestId === "string" &&
    isPlainObject(value.error) &&
    typeof value.error.code === "string"
  ) {
    const messages: Record<number, string> = {
      400: "API отклонил некорректный JSON.",
      413: "API отклонил слишком большой запрос.",
      422: "API отклонил данные расчёта.",
      429: "API временно ограничил запросы.",
      500: "API сообщил о внутренней ошибке."
    };
    return {
      ok: false,
      message: messages[status] ?? "API вернул ошибку.",
      requestId: SAFE_REQUEST_ID.test(value.requestId) ? value.requestId : undefined
    };
  }
  return { ok: false, message: "API вернул ошибку в неизвестном формате." };
}

function isCalculationResult(value: unknown): value is CalculationResult {
  if (!isPlainObject(value) || !hasExactKeys(value, RESULT_KEYS) || !Array.isArray(value.items)) {
    return false;
  }
  if (value.items.length < 1 || value.items.length > 100) {
    return false;
  }
  const seenIds = new Set<string>();
  for (const line of value.items) {
    if (!isCalculationLine(line) || seenIds.has(line.itemId)) {
      return false;
    }
    seenIds.add(line.itemId);
  }
  return (
    value.currency === "RUB" &&
    value.calculationVersion === "1" &&
    isSafeInteger(value.subtotalMinor) &&
    isSafeInteger(value.overallDiscountMinor) &&
    isSafeInteger(value.amountAfterDiscountMinor) &&
    isSafeInteger(value.taxMinor) &&
    isSafeInteger(value.totalMinor)
  );
}

function isCalculationLine(value: unknown): value is CalculationResult["items"][number] {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, LINE_KEYS) &&
    typeof value.itemId === "string" &&
    value.itemId.trim() !== "" &&
    Array.from(value.itemId).length <= 64 &&
    isSafeInteger(value.lineGrossMinor) &&
    isSafeInteger(value.lineDiscountMinor) &&
    isSafeInteger(value.lineTotalMinor)
  );
}

function isSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_SAFE_MINOR
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, allowed: Set<string>): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.size && keys.every((key) => allowed.has(key));
}
