import { useCallback, useMemo, useState } from "react";
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

type Feedback = {
  tone: "success" | "error" | "neutral";
  text: string;
};

export function App() {
  const [draft, setDraft] = useState<EditableDraft>(() => createNewDraft());
  const [touchedFields, setTouchedFields] = useState<Set<string>>(() => new Set());
  const [drafts, setDrafts] = useState(() => loadDrafts());
  const [feedback, setFeedback] = useState<Feedback>({
    tone: "neutral",
    text: drafts.warning ?? "Черновики хранятся только в этом браузере."
  });

  const calculation = useMemo(() => evaluateDraft(draft), [draft]);

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

  const updateDraft = useCallback((updater: (current: EditableDraft) => EditableDraft) => {
    setDraft((current) => updater(current));
  }, []);

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
    setDraft(createNewDraft());
    resetTouched();
    setFeedback({ tone: "neutral", text: "Создан новый пустой расчёт." });
  }, [resetTouched]);

  const fillDemo = useCallback(() => {
    setDraft(createDemoDraft());
    resetTouched();
    setFeedback({ tone: "neutral", text: "Добавлен синтетический демо-пример." });
  }, [resetTouched]);

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
      setDraft(found);
      resetTouched();
      setFeedback({ tone: "success", text: "Черновик открыт." });
    },
    [refreshDrafts, resetTouched]
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
            onAddItem={addItem}
            onDraftChange={setDraft}
            onFieldBlur={markFieldTouched}
            onFillDemo={fillDemo}
            onPrint={printCalculation}
            onRemoveItem={removeItem}
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
        <PrintDocument calculation={calculation} draft={draft} />
      </main>
    </div>
  );
}
