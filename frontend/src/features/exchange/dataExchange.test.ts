import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CalculationResult, QuoteCalculationInput } from "../calculation/types";
import {
  calculationInputToDraft,
  basisPointsToDecimalString,
  createExportEnvelope,
  downloadTextFile,
  importCalculationFile,
  serializeCalculationEnvelope,
  serializeItemsCsv
} from "./dataExchange";

const input: QuoteCalculationInput = {
  schemaVersion: "1",
  projectName: "Демо",
  client: { displayName: "Клиент", contactNote: "Заметка" },
  items: [
    {
      id: "item-1",
      name: "Работа, \"А\"",
      description: "=опасная\r\nстрока",
      quantity: "2",
      unit: "час",
      unitPriceMinor: 150050,
      discountBasisPoints: 1250
    },
    {
      id: "item-2",
      name: "Вторая",
      description: "",
      quantity: "1.5",
      unit: "шт.",
      unitPriceMinor: 10000,
      discountBasisPoints: 0
    }
  ],
  overallDiscountBasisPoints: 500,
  taxBasisPoints: 2000,
  comment: "Комментарий",
  currency: "RUB"
};

const result: CalculationResult = {
  items: [
    {
      itemId: "item-1",
      lineGrossMinor: 300100,
      lineDiscountMinor: 37513,
      lineTotalMinor: 262587
    },
    {
      itemId: "item-2",
      lineGrossMinor: 15000,
      lineDiscountMinor: 0,
      lineTotalMinor: 15000
    }
  ],
  subtotalMinor: 277587,
  overallDiscountMinor: 13879,
  amountAfterDiscountMinor: 263708,
  taxMinor: 52742,
  totalMinor: 316450,
  currency: "RUB",
  calculationVersion: "1"
};

function fileFromText(text: string, size?: number): File {
  const file = new File([text], "quote.json", { type: "application/json" });
  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size });
  }
  return file;
}

describe("data exchange helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("serializes the exact JSON export envelope deterministically", () => {
    const json = serializeCalculationEnvelope(input);
    const parsed = JSON.parse(json);

    expect(json.endsWith("\n")).toBe(true);
    expect(parsed).toEqual(createExportEnvelope(input));
    expect(Object.keys(parsed)).toEqual(["exportVersion", "type", "calculation"]);
    expect(json).not.toContain("createdAt");
    expect(json).not.toContain("totalMinor");
  });

  it("imports a valid JSON export into a fresh editable draft", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
    const imported = await importCalculationFile(fileFromText(serializeCalculationEnvelope(input)));

    expect(imported.ok).toBe(true);
    if (!imported.ok) {
      return;
    }
    expect(imported.draft.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(imported.draft.items.map((item) => item.id)).toEqual(["item-1", "item-2"]);
    expect(imported.draft.items[0].unitPriceRublesText).toBe("1500.50");
    expect(imported.draft.items[0].discountPercentText).toBe("12.50");
    expect(imported.draft.overallDiscountPercentText).toBe("5");
    expect(imported.draft.taxMode).toBe("custom");
    expect(imported.draft.taxRatePercentText).toBe("20");
  });

  it.each([
    ["unsupported version", { exportVersion: "2", type: "quoteflow-calculation", calculation: input }],
    ["wrong type", { exportVersion: "1", type: "other", calculation: input }],
    ["raw input", input],
    ["unknown root field", { exportVersion: "1", type: "quoteflow-calculation", calculation: input, extra: true }],
    ["unknown calculation field", { exportVersion: "1", type: "quoteflow-calculation", calculation: { ...input, extra: true } }],
    ["wrong runtime field type", { exportVersion: "1", type: "quoteflow-calculation", calculation: { ...input, taxBasisPoints: "0" } }],
    ["out-of-range money", { exportVersion: "1", type: "quoteflow-calculation", calculation: { ...input, items: [{ ...input.items[0], unitPriceMinor: 1_000_000_000_001 }] } }],
    ["out-of-range basis points", { exportVersion: "1", type: "quoteflow-calculation", calculation: { ...input, overallDiscountBasisPoints: 10001 } }],
    ["more than 100 items", { exportVersion: "1", type: "quoteflow-calculation", calculation: { ...input, items: Array.from({ length: 101 }, (_, index) => ({ ...input.items[0], id: `item-${index}` })) } }],
    ["unknown client field", { exportVersion: "1", type: "quoteflow-calculation", calculation: { ...input, client: { ...input.client, extra: true } } }],
    ["unknown item field", { exportVersion: "1", type: "quoteflow-calculation", calculation: { ...input, items: [{ ...input.items[0], extra: true }] } }],
    ["invalid quantity", { exportVersion: "1", type: "quoteflow-calculation", calculation: { ...input, items: [{ ...input.items[0], quantity: "1.0000" }] } }],
    ["duplicate IDs", { exportVersion: "1", type: "quoteflow-calculation", calculation: { ...input, items: [{ ...input.items[0] }, { ...input.items[1], id: "item-1" }] } }]
  ])("rejects %s", async (_name, payload) => {
    const imported = await importCalculationFile(fileFromText(`${JSON.stringify(payload)}\n`));

    expect(imported.ok).toBe(false);
  });

  it("rejects malformed and oversized JSON files", async () => {
    await expect(importCalculationFile(fileFromText("{"))).resolves.toMatchObject({ ok: false });
    await expect(importCalculationFile(fileFromText("{}", 256 * 1024 + 1))).resolves.toMatchObject({
      ok: false
    });
  });

  it("handles file read rejection safely", async () => {
    const file = fileFromText("{}");
    vi.spyOn(file, "text").mockRejectedValue(new Error("read failed"));

    await expect(importCalculationFile(file)).resolves.toEqual({
      ok: false,
      message: "Не удалось прочитать файл."
    });
  });

  it.each([
    [0, "0"],
    [1, "0.01"],
    [100, "1"],
    [1234, "12.34"],
    [10000, "100"]
  ])("formats %i basis points without floating point", (value, expected) => {
    expect(basisPointsToDecimalString(value)).toBe(expected);
  });

  it.each([-1, 10001, 1.5])("rejects invalid basis points %s", (value) => {
    expect(() => basisPointsToDecimalString(value)).toThrow(RangeError);
  });

  it("converts strict input to editable draft without floating point", () => {
    const draft = calculationInputToDraft(input, "2026-07-19T00:00:00.000Z");

    expect(draft.items[0].unitPriceRublesText).toBe("1500.50");
    expect(draft.items[0].discountPercentText).toBe("12.50");
    expect(draft.createdAt).toBe("2026-07-19T00:00:00.000Z");
  });

  it("serializes CSV with exact headers, CRLF, BOM, quoting and formula protection", () => {
    const csv = serializeItemsCsv(input, result);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(
      "\"item_id\",\"name\",\"description\",\"quantity\",\"unit\",\"unit_price_rub\",\"discount_percent\",\"line_gross_rub\",\"line_discount_rub\",\"line_total_rub\",\"currency\""
    );
    expect(csv).toContain("\"item-1\",\"Работа, \"\"А\"\"\",\"'=опасная\r\nстрока\",\"2\",\"час\",\"1500.50\",\"12.50\",\"3001.00\",\"375.13\",\"2625.87\",\"RUB\"");
    expect(csv).toContain("\r\n");
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.indexOf("\"item-1\"")).toBeLessThan(csv.indexOf("\"item-2\""));
  });

  it.each(["=cmd", "+cmd", "-cmd", "@cmd", "  =cmd", "\tcmd", "\rcmd"])(
    "protects CSV text beginning with %j",
    (value) => {
      const csv = serializeItemsCsv(
        { ...input, items: [{ ...input.items[0], id: value, name: value, description: value, unit: value }] },
        { ...result, items: [{ ...result.items[0], itemId: value }] }
      );

      expect(csv).toContain(`"'${value.replace(/"/g, '""')}"`);
    }
  );

  it("removes temporary anchors and defers object URL revocation", () => {
    vi.useFakeTimers();
    let capturedBlob: Blob | undefined;
    const createUrl = vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      if (blob instanceof Blob) {
        capturedBlob = blob;
      }
      return "blob:quote";
    });
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadTextFile("body", "quote.json", "application/json;charset=utf-8");

    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(capturedBlob?.type).toBe("application/json;charset=utf-8");
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download="quote.json"]')).not.toBeInTheDocument();
    expect(revokeUrl).not.toHaveBeenCalled();
    vi.runOnlyPendingTimers();
    expect(revokeUrl).toHaveBeenCalledWith("blob:quote");
  });

  it("still schedules download cleanup when clicking throws", () => {
    vi.useFakeTimers();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:quote");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("click failed");
    });

    expect(() => downloadTextFile("body", "quote.json", "application/json;charset=utf-8")).toThrow("click failed");
    expect(document.querySelector('a[download="quote.json"]')).not.toBeInTheDocument();
    vi.runOnlyPendingTimers();
    expect(revokeUrl).toHaveBeenCalledWith("blob:quote");
  });
});
