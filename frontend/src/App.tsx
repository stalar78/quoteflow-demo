import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { DemoNotice } from "./components/DemoNotice";
import { CalculationForm } from "./features/calculation/CalculationForm";
import {
  createDemoDraft,
  createEmptyItem,
  createNewDraft,
  type EditableDraft
} from "./features/calculation/editableTypes";
import { evaluateDraft } from "./features/calculation/inputAdapters";
import { PrintDocument } from "./features/calculation/PrintDocument";
import { SummaryPanel } from "./features/calculation/SummaryPanel";
import { DraftsPanel } from "./features/drafts/DraftsPanel";
import {
  clearDrafts,
  deleteDraft,
  loadDrafts,
  saveDraft
} from "./features/drafts/draftStorage";
import {
  downloadServerPdfBlob,
  requestServerPdf
} from "./features/documents/pdfClient";
import { DataExchangePanel } from "./features/exchange/DataExchangePanel";

type Feedback = {
  tone: "success" | "error" | "neutral";
  text: string;
};

type ServerPdfState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string; requestId?: string }
  | { status: "error"; message: string; requestId?: string };

type ServerPdfRequest = {
  controller: AbortController;
  generation: number;
  timeoutId: number;
  timedOut: boolean;
};

const SERVER_PDF_TIMEOUT_MS = 15_000;

export function App() {
  const [draft, setDraft] = useState<EditableDraft>(() => createNewDraft());
  const [touchedFields, setTouchedFields] = useState<Set<string>>(() => new Set());
  const [drafts, setDrafts] = useState(() => loadDrafts());
  const [feedback, setFeedback] = useState<Feedback>({
    tone: "neutral",
    text: drafts.warning ?? "Черновики хранятся только в этом браузере."
  });
  const [serverPdfState, setServerPdfState] = useState<ServerPdfState>({
    status: "idle",
    message: "Серверный PDF ещё не формировался."
  });
  const serverPdfRequestRef = useRef<ServerPdfRequest | null>(null);
  const serverPdfGenerationRef = useRef(0);

  const calculation = useMemo(() => evaluateDraft(draft), [draft]);

  const abortServerPdfRequest = useCallback(() => {
    if (!serverPdfRequestRef.current) {
      return;
    }
    window.clearTimeout(serverPdfRequestRef.current.timeoutId);
    serverPdfRequestRef.current.controller.abort();
    serverPdfRequestRef.current = null;
  }, []);

  const invalidateServerPdf = useCallback(
    (message?: string) => {
      serverPdfGenerationRef.current += 1;
      abortServerPdfRequest();
      if (message) {
        setServerPdfState({
          status: "idle",
          message
        });
      }
    },
    [abortServerPdfRequest]
  );

  useEffect(() => {
    return () => {
      invalidateServerPdf();
    };
  }, [invalidateServerPdf]);

  const replaceDraft = useCallback(
    (nextDraft: EditableDraft) => {
      invalidateServerPdf("Серверный PDF сброшен после изменения расчёта.");
      setDraft(nextDraft);
    },
    [invalidateServerPdf]
  );

  const resetTouched = useCallback(() => {
    setTouchedFields(new Set());
  }, []);

  const refreshDrafts = useCallback(() => {
    const loaded = loadDrafts();
    setDrafts(loaded);
    if (loaded.warning) {
      setFeedback({ tone: "error", text: loaded.warning });
    }
    return loaded;
  }, []);

  const updateDraft = useCallback(
    (updater: (current: EditableDraft) => EditableDraft) => {
      invalidateServerPdf("Серверный PDF сброшен после изменения расчёта.");
      setDraft((current) => updater(current));
    },
    [invalidateServerPdf]
  );

  const markFieldTouched = useCallback((field: string) => {
    setTouchedFields((current) => {
      if (current.has(field)) {
        return current;
      }
      const next = new Set(current);
      next.add(field);
      return next;
    });
  }, []);

  const startNew = useCallback(() => {
    invalidateServerPdf("Серверный PDF сброшен для нового расчёта.");
    setDraft(createNewDraft());
    resetTouched();
    setFeedback({ tone: "neutral", text: "Создан новый пустой расчёт." });
  }, [invalidateServerPdf, resetTouched]);

  const fillDemo = useCallback(() => {
    invalidateServerPdf("Серверный PDF сброшен после демо-примера.");
    setDraft(createDemoDraft());
    resetTouched();
    setFeedback({ tone: "neutral", text: "Добавлен синтетический демо-пример." });
  }, [invalidateServerPdf, resetTouched]);

  const handleSave = useCallback(() => {
    const result = saveDraft(draft);
    if (result.ok) {
      setDraft(result.draft);
      setDrafts({ drafts: result.drafts });
      setFeedback({ tone: "success", text: "Черновик сохранён." });
      return;
    }
    setFeedback({ tone: "error", text: result.message });
  }, [draft]);

  const handleOpen = useCallback(
    (id: string) => {
      const found = refreshDrafts().drafts.find((candidate) => candidate.id === id);
      if (!found) {
        setFeedback({ tone: "error", text: "Черновик не найден." });
        return;
      }
      invalidateServerPdf("Серверный PDF сброшен после открытия черновика.");
      setDraft(found);
      resetTouched();
      setFeedback({ tone: "success", text: "Черновик открыт." });
    },
    [invalidateServerPdf, refreshDrafts, resetTouched]
  );

  const handleDelete = useCallback((id: string) => {
    const result = deleteDraft(id);
    if (result.ok) {
      setDrafts({ drafts: result.drafts });
      setFeedback({ tone: "success", text: "Черновик удалён." });
      return;
    }
    setFeedback({ tone: "error", text: result.message });
  }, []);

  const handleClear = useCallback(() => {
    const result = clearDrafts();
    if (result.ok) {
      setDrafts({ drafts: [] });
      setFeedback({ tone: "success", text: "Все черновики QuoteFlow удалены." });
      return;
    }
    setFeedback({ tone: "error", text: result.message });
  }, []);

  const addItem = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      items: [...current.items, createEmptyItem()]
    }));
  }, [updateDraft]);

  const removeItem = useCallback(
    (id: string) => {
      updateDraft((current) => {
        const nextItems = current.items.filter((item) => item.id !== id);
        return {
          ...current,
          items: nextItems.length > 0 ? nextItems : [createEmptyItem()]
        };
      });
      setTouchedFields((current) => {
        const next = new Set([...current].filter((field) => !field.startsWith(`items.${id}.`)));
        return next;
      });
    },
    [updateDraft]
  );

  const printCalculation = useCallback(() => {
    window.print();
  }, []);

  const downloadServerPdf = useCallback(async () => {
    if (!calculation.ok || calculation.input.projectName.trim() === "") {
      setServerPdfState({
        status: "error",
        message: "Заполните валидный расчёт и название проекта."
      });
      return;
    }

    abortServerPdfRequest();
    const controller = new AbortController();
    const generation = serverPdfGenerationRef.current;
    const request: ServerPdfRequest = {
      controller,
      generation,
      timeoutId: 0,
      timedOut: false
    };
    request.timeoutId = window.setTimeout(() => {
      request.timedOut = true;
      controller.abort();
    }, SERVER_PDF_TIMEOUT_MS);
    serverPdfRequestRef.current = request;
    setServerPdfState({ status: "loading", message: "Формируем PDF на сервере..." });

    const response = await requestServerPdf(calculation.input, controller.signal);
    window.clearTimeout(request.timeoutId);
    if (serverPdfRequestRef.current !== request || serverPdfGenerationRef.current !== generation) {
      return;
    }
    serverPdfRequestRef.current = null;

    if (!response.ok) {
      if (request.timedOut) {
        setServerPdfState({
          status: "error",
          message: "PDF API не ответил за 15 секунд. Повторите загрузку."
        });
        return;
      }
      if (response.canceled || controller.signal.aborted) {
        return;
      }
      setServerPdfState({
        status: "error",
        message: response.message,
        requestId: response.requestId
      });
      return;
    }

    try {
      downloadServerPdfBlob(response.blob);
    } catch {
      setServerPdfState({
        status: "error",
        message: "PDF сформирован, но браузер не запустил скачивание.",
        requestId: response.requestId
      });
      return;
    }

    setServerPdfState({
      status: "success",
      message: "PDF с сервера сформирован и передан браузеру для скачивания.",
      requestId: response.requestId
    });
  }, [abortServerPdfRequest, calculation]);

  const importDraft = useCallback(
    (nextDraft: EditableDraft, message: string) => {
      invalidateServerPdf("Серверный PDF сброшен после импорта JSON.");
      setDraft(nextDraft);
      resetTouched();
      setFeedback({ tone: "success", text: message });
    },
    [invalidateServerPdf, resetTouched]
  );

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-slate-900">
      <AppHeader onNew={startNew} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <DemoNotice />
        <div className="grid gap-7 xl:grid-cols-[minmax(0,8fr)_minmax(360px,4fr)] xl:items-start">
          <CalculationForm
            calculation={calculation}
            draft={draft}
            feedback={feedback}
            serverPdfState={serverPdfState}
            onAddItem={addItem}
            onDraftChange={replaceDraft}
            onFieldBlur={markFieldTouched}
            onFillDemo={fillDemo}
            onPrint={printCalculation}
            onRemoveItem={removeItem}
            onServerPdfDownload={downloadServerPdf}
            touchedFields={touchedFields}
          />
          <aside className="flex min-w-0 flex-col gap-7 xl:sticky xl:top-6">
            <SummaryPanel calculation={calculation} />
            <DraftsPanel
              drafts={drafts.drafts}
              onClear={handleClear}
              onDelete={handleDelete}
              onOpen={handleOpen}
              onSave={handleSave}
            />
          </aside>
        </div>
        <DataExchangePanel
          key={draft.id}
          calculation={calculation}
          onImportDraft={importDraft}
        />
        <PrintDocument calculation={calculation} draft={draft} />
      </main>
    </div>
  );
}
