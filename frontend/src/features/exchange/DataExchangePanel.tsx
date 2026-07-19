import { useEffect, useMemo, useRef, useState } from "react";
import type { EditableDraft } from "../calculation/editableTypes";
import type { DraftEvaluation } from "../calculation/inputAdapters";
import { formatMoney } from "../calculation/inputAdapters";
import {
  postCalculationPreview,
  resultsMatch,
  type PreviewSuccess
} from "./apiClient";
import {
  CSV_EXPORT_FILENAME,
  JSON_EXPORT_FILENAME,
  downloadTextFile,
  importCalculationFile,
  serializeCalculationEnvelope,
  serializeItemsCsv
} from "./dataExchange";

type DataExchangePanelProps = {
  calculation: DraftEvaluation;
  onImportDraft: (draft: EditableDraft, message: string) => void;
};

type ApiState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string; response: PreviewSuccess }
  | { status: "mismatch"; message: string; response: PreviewSuccess }
  | { status: "error"; message: string; requestId?: string };

type InFlightRequest = {
  controller: AbortController;
  key: string;
  timeoutId: number;
  timedOut: boolean;
};

export function DataExchangePanel({ calculation, onImportDraft }: DataExchangePanelProps) {
  const [importMessage, setImportMessage] = useState("JSON импорт доступен для файла до 256 КиБ.");
  const [apiState, setApiState] = useState<ApiState>({
    status: "idle",
    message: "API preview не выполнялся."
  });
  const requestRef = useRef<InFlightRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputKey = calculation.ok ? JSON.stringify(calculation.input) : "";
  const payloadPreview = useMemo(
    () => (calculation.ok ? `${JSON.stringify(calculation.input, null, 2)}\n` : ""),
    [calculation]
  );

  useEffect(() => {
    abortCurrentRequest();
    requestRef.current = null;
    setApiState({ status: "idle", message: "API preview сброшен после изменения расчёта." });
    return () => {
      abortCurrentRequest();
    };
  }, [inputKey]);

  const exportJson = () => {
    if (!calculation.ok) {
      return;
    }
    downloadTextFile(
      serializeCalculationEnvelope(calculation.input),
      JSON_EXPORT_FILENAME,
      "application/json;charset=utf-8"
    );
  };

  const exportCsv = () => {
    if (!calculation.ok) {
      return;
    }
    downloadTextFile(
      serializeItemsCsv(calculation.input, calculation.result),
      CSV_EXPORT_FILENAME,
      "text/csv;charset=utf-8"
    );
  };

  const importJson = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    const result = await importCalculationFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (!result.ok) {
      setImportMessage(result.message);
      return;
    }
    setImportMessage("JSON импортирован. Черновик заменён после строгой проверки.");
    onImportDraft(result.draft, "JSON импортирован. Черновик заменён после строгой проверки.");
  };

  const previewViaApi = async () => {
    if (!calculation.ok) {
      return;
    }
    abortCurrentRequest();
    const controller = new AbortController();
    const key = JSON.stringify(calculation.input);
    const request: InFlightRequest = {
      controller,
      key,
      timeoutId: 0,
      timedOut: false
    };
    request.timeoutId = window.setTimeout(() => {
      request.timedOut = true;
      controller.abort();
    }, 10_000);
    requestRef.current = request;
    setApiState({ status: "loading", message: "Отправляем расчёт в API..." });
    const response = await postCalculationPreview(calculation.input, controller.signal);
    window.clearTimeout(request.timeoutId);
    if (requestRef.current !== request || request.key !== key) {
      return;
    }
    requestRef.current = null;
    if (!response.ok) {
      if (request.timedOut) {
        setApiState({
          status: "error",
          message: "API не ответил за 10 секунд. Повторите запрос."
        });
        return;
      }
      if (controller.signal.aborted) {
        return;
      }
      setApiState({
        status: "error",
        message: response.message,
        requestId: response.requestId
      });
      return;
    }
    const matched = resultsMatch(calculation.result, response.data.calculation);
    setApiState({
      status: matched ? "success" : "mismatch",
      message: matched
        ? "Backend result совпадает с локальным расчётом."
        : "Backend result отличается от локального расчёта.",
      response: response.data
    });
  };

  const buttonClass =
    "min-h-11 rounded-lg px-4 py-2.5 text-[15px] font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50";
  const canUseStrictInput = calculation.ok;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-slate-950">Обмен данными</h2>
        <p className="text-[15px] leading-6 text-slate-600">
          Экспорт и API preview используют только строгий QuoteCalculationInput без черновиковых метаданных.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className={`${buttonClass} bg-teal-700 text-white hover:bg-teal-800`}
          type="button"
          disabled={!canUseStrictInput}
          onClick={exportJson}
        >
          Экспорт JSON
        </button>
        <label className={`${buttonClass} inline-flex cursor-pointer items-center border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>
          Импорт JSON
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importJson(event.target.files?.[0])}
          />
        </label>
        <button
          className={`${buttonClass} bg-teal-700 text-white hover:bg-teal-800`}
          type="button"
          disabled={!canUseStrictInput}
          onClick={exportCsv}
        >
          Экспорт CSV
        </button>
        <button
          className={`${buttonClass} bg-slate-900 text-white hover:bg-slate-800`}
          type="button"
          disabled={!canUseStrictInput}
          onClick={() => void previewViaApi()}
        >
          {apiState.status === "loading" ? "Повторить запрос" : "Проверить через API"}
        </button>
      </div>

      <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-[15px] leading-6 text-slate-700" role="status">
        {importMessage}
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900">Payload preview</h3>
          <p className="mt-1 text-[13px] leading-5 text-slate-500">
            Просмотр payload ничего не отправляет.
          </p>
          {calculation.ok ? (
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-950 p-4 text-[12px] leading-5 text-slate-50">
              {payloadPreview}
            </pre>
          ) : (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-[15px] leading-6 text-slate-600">
              Заполните расчёт, чтобы увидеть строгий payload.
            </div>
          )}
        </div>

        <div
          className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 text-[15px] leading-6"
          role="status"
          aria-live="polite"
        >
          <h3 className="font-semibold text-slate-900">API status</h3>
          <p className={apiTone(apiState.status)}>{apiState.message}</p>
          {"response" in apiState ? (
            <div className="mt-3 space-y-2 text-[13px] leading-5 text-slate-600">
              <p className="break-all">Request ID: <span className="font-mono">{apiState.response.requestId}</span></p>
              <p>Backend total: {formatMoney(apiState.response.calculation.totalMinor)}</p>
            </div>
          ) : null}
          {"requestId" in apiState && apiState.requestId ? (
            <p className="mt-3 break-all text-[13px] leading-5 text-slate-600">
              Request ID: <span className="font-mono">{apiState.requestId}</span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );

  function abortCurrentRequest() {
    if (!requestRef.current) {
      return;
    }
    window.clearTimeout(requestRef.current.timeoutId);
    requestRef.current.controller.abort();
  }
}

function apiTone(status: ApiState["status"]): string {
  const base = "mt-3 rounded-lg px-3 py-2";
  if (status === "success") {
    return `${base} bg-teal-50 text-teal-800`;
  }
  if (status === "mismatch" || status === "error") {
    return `${base} bg-red-50 text-red-800`;
  }
  return `${base} bg-white text-slate-700`;
}
