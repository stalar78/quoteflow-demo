import { afterEach, describe, expect, it, vi } from "vitest";
import type { CalculationResult, QuoteCalculationInput } from "../calculation/types";
import { postCalculationPreview, resultsMatch } from "./apiClient";

const input: QuoteCalculationInput = {
  schemaVersion: "1",
  projectName: "Демо",
  client: { displayName: "", contactNote: "" },
  items: [
    {
      id: "item-1",
      name: "Работа",
      description: "",
      quantity: "1",
      unit: "час",
      unitPriceMinor: 10000,
      discountBasisPoints: 0
    }
  ],
  overallDiscountBasisPoints: 0,
  taxBasisPoints: 0,
  comment: "",
  currency: "RUB"
};

const calculation: CalculationResult = {
  items: [
    {
      itemId: "item-1",
      lineGrossMinor: 10000,
      lineDiscountMinor: 0,
      lineTotalMinor: 10000
    }
  ],
  subtotalMinor: 10000,
  overallDiscountMinor: 0,
  amountAfterDiscountMinor: 10000,
  taxMinor: 0,
  totalMinor: 10000,
  currency: "RUB",
  calculationVersion: "1"
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("preview API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the exact preview request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ requestId: "ui-test", calculation })
    );
    const controller = new AbortController();

    const response = await postCalculationPreview(input, controller.signal, "ui-test");

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/calculations/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": "ui-test"
      },
      body: JSON.stringify(input),
      signal: controller.signal
    });
  });

  it("handles backend validation envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(errorResponse(422));

    await expect(postCalculationPreview(input, new AbortController().signal, "ui-test")).resolves.toEqual({
      ok: false,
      message: "API отклонил данные расчёта.",
      requestId: "server-id"
    });
  });

  it.each([
    [400, "API отклонил некорректный JSON."],
    [413, "API отклонил слишком большой запрос."],
    [422, "API отклонил данные расчёта."],
    [429, "API временно ограничил запросы."],
    [500, "API сообщил о внутренней ошибке."]
  ])("maps backend error status %i to a safe local message", async (status, message) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(errorResponse(status));

    await expect(postCalculationPreview(input, new AbortController().signal, "ui-test")).resolves.toEqual({
      ok: false,
      message,
      requestId: "server-id"
    });
  });

  it("handles malformed, non-JSON and network responses safely", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("{", { headers: { "content-type": "application/json" } })
    );
    await expect(postCalculationPreview(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "API вернул повреждённый JSON."
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("<html>", { status: 500 }));
    await expect(postCalculationPreview(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "API вернул ответ не в JSON."
    });

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    await expect(postCalculationPreview(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "Не удалось связаться с API."
    });
  });

  it("reports aborted requests safely", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("aborted", "AbortError"));

    await expect(postCalculationPreview(input, controller.signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "Запрос отменён."
    });
  });

  it.each([
    ["unknown root field", { requestId: "ui-test", calculation, extra: true }],
    ["invalid request ID", { requestId: "bad id", calculation }],
    ["unknown result field", { requestId: "ui-test", calculation: { ...calculation, extra: true } }],
    ["invalid item count", { requestId: "ui-test", calculation: { ...calculation, items: [] } }],
    ["duplicate item IDs", { requestId: "ui-test", calculation: { ...calculation, items: [calculation.items[0], calculation.items[0]] } }],
    ["unknown line field", { requestId: "ui-test", calculation: { ...calculation, items: [{ ...calculation.items[0], extra: true }] } }],
    ["blank line ID", { requestId: "ui-test", calculation: { ...calculation, items: [{ ...calculation.items[0], itemId: " " }] } }],
    ["over-limit money", { requestId: "ui-test", calculation: { ...calculation, totalMinor: 9_000_000_000_000_001 } }]
  ])("rejects malformed success response: %s", async (_name, body) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(body));

    await expect(postCalculationPreview(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false
    });
  });

  it("compares every result field and preserves item order", () => {
    expect(resultsMatch(calculation, calculation)).toBe(true);
    expect(resultsMatch(calculation, { ...calculation, totalMinor: 10001 })).toBe(false);
    expect(
      resultsMatch(calculation, {
        ...calculation,
        items: [{ ...calculation.items[0], itemId: "other" }]
      })
    ).toBe(false);
  });
});

function errorResponse(status: number): Response {
  return jsonResponse(
    {
      requestId: "server-id",
      error: { code: "VALIDATION_ERROR", message: "do not expose this", fields: [] }
    },
    status
  );
}
