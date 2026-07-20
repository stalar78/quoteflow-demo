import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuoteCalculationInput } from "../calculation/types";
import {
  downloadServerPdfBlob,
  MAX_SERVER_PDF_BYTES,
  requestServerPdf,
  SERVER_PDF_FILENAME
} from "./pdfClient";

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

const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

function pdfResponse(bytes: Uint8Array = pdfBytes, headers: Record<string, string> = {}) {
  return new Response(toExactArrayBuffer(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(bytes.byteLength),
      "x-request-id": "server-id",
      ...headers
    }
  });
}

describe("server PDF client", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sends only the strict calculation payload and safe request headers", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(pdfResponse());
    const controller = new AbortController();

    const result = await requestServerPdf(input, controller.signal, "ui-test");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/documents/pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": "ui-test"
      },
      body: JSON.stringify(input),
      signal: controller.signal
    });
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).not.toHaveProperty(
      "totalMinor"
    );
  });

  it.each(["bad id", "é", "x".repeat(65)])(
    "replaces unsafe caller request ID %s before sending",
    async (unsafeRequestId) => {
      vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
        (array as Uint8Array).fill(3);
        return array;
      });
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(pdfResponse());

      await requestServerPdf(input, new AbortController().signal, unsafeRequestId);

      expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
        "X-Request-ID": "ui-03030303030303030303030303030303"
      });
    }
  );

  it("accepts PDF MIME parameters and returns a blob for a valid PDF", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      pdfResponse(pdfBytes, { "content-type": "application/pdf; charset=binary" })
    );

    const result = await requestServerPdf(input, new AbortController().signal, "ui-test");

    expect(result).toMatchObject({ ok: true, requestId: "server-id" });
    expect(result.ok && result.blob.type).toBe("application/pdf");
  });

  it.each([
    ["text/html", pdfBytes],
    ["application/octet-stream", pdfBytes]
  ])("rejects non-PDF MIME %s", async (contentType, bytes) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(pdfResponse(bytes, { "content-type": contentType }));

    await expect(requestServerPdf(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "PDF API вернул ответ не в формате PDF."
    });
  });

  it("rejects missing signature, empty payload, declared oversize and actual oversize", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(pdfResponse(new Uint8Array([1, 2, 3])));
    await expect(requestServerPdf(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "PDF API вернул файл с некорректной сигнатурой."
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(pdfResponse(new Uint8Array()));
    await expect(requestServerPdf(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "PDF API вернул пустой файл."
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      pdfResponse(pdfBytes, { "content-length": String(MAX_SERVER_PDF_BYTES + 1) })
    );
    await expect(requestServerPdf(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "PDF слишком большой для безопасной загрузки."
    });

    const oversized = new Uint8Array(MAX_SERVER_PDF_BYTES + 1);
    oversized.set(pdfBytes, 0);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(toExactArrayBuffer(oversized), {
        headers: { "content-type": "application/pdf", "x-request-id": "server-id" }
      })
    );
    await expect(requestServerPdf(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "PDF слишком большой для безопасной загрузки."
    });
  });

  it("streams multi-chunk PDFs and cancels immediately when the bounded size is exceeded", async () => {
    let canceled = false;
    const chunk = new Uint8Array(MAX_SERVER_PDF_BYTES);
    chunk.set(pdfBytes, 0);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(new Uint8Array([1]));
      },
      cancel() {
        canceled = true;
      }
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(stream, {
        headers: { "content-type": "application/pdf", "x-request-id": "server-id" }
      })
    );

    await expect(requestServerPdf(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "PDF слишком большой для безопасной загрузки."
    });
    expect(canceled).toBe(true);
  });

  it("reports abort during streaming and cancels the response reader", async () => {
    let canceled = false;
    let pullCount = 0;
    const controller = new AbortController();
    const stream = new ReadableStream<Uint8Array>({
      pull(streamController) {
        pullCount += 1;
        if (pullCount === 1) {
          streamController.enqueue(pdfBytes);
          return;
        }
        controller.abort();
      },
      cancel() {
        canceled = true;
      }
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(stream, {
        headers: { "content-type": "application/pdf", "x-request-id": "server-id" }
      })
    );

    await expect(requestServerPdf(input, controller.signal, "ui-test")).resolves.toEqual({
      ok: false,
      message: "Запрос PDF отменён.",
      requestId: "server-id",
      canceled: true
    });
    expect(canceled).toBe(true);
  });

  it("maps malformed or unsafe error responses to safe local messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html>stack trace</html>", { status: 500, headers: { "content-type": "text/html" } })
    );
    await expect(requestServerPdf(input, new AbortController().signal, "ui-test")).resolves.toEqual({
      ok: false,
      message: "PDF API сообщил о внутренней ошибке.",
      requestId: undefined
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("{", { status: 422, headers: { "content-type": "application/json" } })
    );
    await expect(requestServerPdf(input, new AbortController().signal, "ui-test")).resolves.toMatchObject({
      ok: false,
      message: "PDF API вернул повреждённый JSON ошибки."
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ requestId: "bad id", error: { code: "X" } }), {
        status: 422,
        headers: { "content-type": "application/json", "x-request-id": "safe-server" }
      })
    );
    await expect(requestServerPdf(input, new AbortController().signal, "ui-test")).resolves.toEqual({
      ok: false,
      message: "PDF API отклонил данные документа.",
      requestId: "safe-server"
    });
  });

  it("reports ordinary abort safely", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("aborted", "AbortError"));

    await expect(requestServerPdf(input, controller.signal, "ui-test")).resolves.toEqual({
      ok: false,
      message: "Запрос PDF отменён.",
      canceled: true
    });
  });

  it("downloads with a fixed filename and cleans up object URL and temporary anchor", () => {
    vi.useFakeTimers();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pdf");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadServerPdfBlob(new Blob([toExactArrayBuffer(pdfBytes)], { type: "application/pdf" }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector(`a[download="${SERVER_PDF_FILENAME}"]`)).not.toBeInTheDocument();
    vi.runOnlyPendingTimers();
    expect(revokeUrl).toHaveBeenCalledWith("blob:pdf");
  });

  it("still cleans up when the synthetic anchor click throws", () => {
    vi.useFakeTimers();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pdf");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("click failed");
    });

    expect(() => downloadServerPdfBlob(new Blob([toExactArrayBuffer(pdfBytes)], { type: "application/pdf" }))).toThrow(
      "click failed"
    );
    expect(document.querySelector(`a[download="${SERVER_PDF_FILENAME}"]`)).not.toBeInTheDocument();
    vi.runOnlyPendingTimers();
    expect(revokeUrl).toHaveBeenCalledWith("blob:pdf");
  });
});

function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
