import type { QuoteCalculationInput } from "../calculation/types";
import { createClientRequestId } from "../exchange/apiClient";

export const SERVER_PDF_FILENAME = "quoteflow-proposal.pdf";
export const MAX_SERVER_PDF_BYTES = 2 * 1024 * 1024;

export type ServerPdfResult =
  | { ok: true; blob: Blob; requestId?: string }
  | { ok: false; message: string; requestId?: string; canceled?: boolean };

const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export async function requestServerPdf(
  input: QuoteCalculationInput,
  signal: AbortSignal,
  requestId = createClientRequestId()
): Promise<ServerPdfResult> {
  const outboundRequestId = safeRequestId(requestId) ?? createClientRequestId();
  let response: Response;
  try {
    response = await fetch("/api/v1/documents/pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": outboundRequestId
      },
      body: JSON.stringify(input),
      signal
    });
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      return { ok: false, message: "Запрос PDF отменён.", canceled: true };
    }
    return { ok: false, message: "Не удалось связаться с PDF API." };
  }

  const responseRequestId = safeRequestId(response.headers.get("x-request-id"));
  if (!response.ok) {
    return parsePdfError(response, responseRequestId);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!isPdfContentType(contentType)) {
    return { ok: false, message: "PDF API вернул ответ не в формате PDF.", requestId: responseRequestId };
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      return { ok: false, message: "PDF API вернул некорректный размер ответа.", requestId: responseRequestId };
    }
    if (parsedLength > MAX_SERVER_PDF_BYTES) {
      return { ok: false, message: "PDF слишком большой для безопасной загрузки.", requestId: responseRequestId };
    }
  }

  const body = response.body;
  if (!body) {
    return { ok: false, message: "Не удалось прочитать PDF ответ.", requestId: responseRequestId };
  }

  const streamed = await readBoundedBytes(body, signal);
  if (!streamed.ok) {
    return { ok: false, message: streamed.message, requestId: responseRequestId, canceled: streamed.canceled };
  }

  if (streamed.bytes.byteLength === 0) {
    return { ok: false, message: "PDF API вернул пустой файл.", requestId: responseRequestId };
  }
  if (!hasPdfSignature(streamed.bytes)) {
    return { ok: false, message: "PDF API вернул файл с некорректной сигнатурой.", requestId: responseRequestId };
  }

  return {
    ok: true,
    blob: new Blob([toExactArrayBuffer(streamed.bytes)], { type: "application/pdf" }),
    requestId: responseRequestId
  };
}

export function downloadServerPdfBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = SERVER_PDF_FILENAME;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function isPdfContentType(value: string): boolean {
  return /^application\/pdf(?:\s*;\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=(?:"[^"]*"|[A-Za-z0-9!#$%&'*+.^_`|~-]+))*\s*$/i.test(
    value
  );
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function readBoundedBytes(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; message: string; canceled?: boolean }> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await readNextChunk(reader, signal);
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }
      total += value.byteLength;
      if (total > MAX_SERVER_PDF_BYTES) {
        await reader.cancel();
        return { ok: false, message: "PDF слишком большой для безопасной загрузки." };
      }
      chunks.push(value);
    }
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      return { ok: false, message: "Запрос PDF отменён.", canceled: true };
    }
    return { ok: false, message: "Не удалось прочитать PDF ответ." };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

function readNextChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal.aborted) {
    return Promise.reject(new DOMException("aborted", "AbortError"));
  }

  return new Promise((resolve, reject) => {
    const abort = () => {
      void reader.cancel();
      reject(new DOMException("aborted", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    reader.read().then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", abort);
    });
  });
}

async function parsePdfError(response: Response, requestId?: string): Promise<ServerPdfResult> {
  const messages: Record<number, string> = {
    400: "PDF API отклонил некорректный JSON.",
    413: "PDF API отклонил слишком большой запрос.",
    422: "PDF API отклонил данные документа.",
    429: "PDF API временно ограничил запросы.",
    500: "PDF API сообщил о внутренней ошибке."
  };

  if ((response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    try {
      const body = (await response.json()) as unknown;
      if (isPlainObject(body)) {
        return {
          ok: false,
          message: messages[response.status] ?? "PDF API вернул ошибку.",
          requestId: safeRequestId(body.requestId) ?? requestId
        };
      }
    } catch {
      return { ok: false, message: "PDF API вернул повреждённый JSON ошибки.", requestId };
    }
  }

  return {
    ok: false,
    message: messages[response.status] ?? "PDF API вернул ошибку в неизвестном формате.",
    requestId
  };
}

function safeRequestId(value: unknown): string | undefined {
  return typeof value === "string" && SAFE_REQUEST_ID.test(value) ? value : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
