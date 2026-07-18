import type { EditableDraft } from "../calculation/editableTypes";

export type Feedback = {
  tone: "success" | "error" | "neutral";
  text: string;
};

type DraftsPanelProps = {
  drafts: EditableDraft[];
  onSave: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
};

export function DraftsPanel({ drafts, onSave, onOpen, onDelete, onClear }: DraftsPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Черновики</h2>
          <p className="mt-1.5 text-[15px] leading-6 text-slate-600">
            Локально в браузере, без отправки данных.
          </p>
        </div>
        <button
          className="min-h-11 rounded-lg bg-teal-700 px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-teal-800"
          type="button"
          onClick={onSave}
        >
          Сохранить черновик
        </button>
      </div>

      {drafts.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-[15px] leading-6 text-slate-600">
          Сохранённых черновиков пока нет.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {drafts.map((draft) => (
            <article className="rounded-lg border border-slate-200 bg-white p-4" key={draft.id}>
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold text-slate-950">
                  {draft.projectName.trim() || "Без названия"}
                </h3>
                <p className="mt-1.5 text-[13px] leading-5 text-slate-500">
                  {formatDate(draft.updatedAt)} · {draft.items.length} поз.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="min-h-10 rounded-lg border border-slate-300 px-3.5 py-2 text-[14px] font-semibold text-slate-800 hover:bg-slate-50"
                  type="button"
                  onClick={() => onOpen(draft.id)}
                >
                  Открыть
                </button>
                <button
                  className="min-h-10 rounded-lg border border-red-200 px-3.5 py-2 text-[14px] font-semibold text-red-700 hover:bg-red-50"
                  type="button"
                  onClick={() => onDelete(draft.id)}
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <button
        className="mt-5 min-h-11 w-full rounded-lg border border-red-200 px-4 py-2.5 text-[15px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-70"
        type="button"
        onClick={onClear}
        disabled={drafts.length === 0}
      >
        Очистить все черновики
      </button>
    </section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Дата неизвестна";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}
