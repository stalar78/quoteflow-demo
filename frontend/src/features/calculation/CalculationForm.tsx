import { Field } from "../../components/Field";
import type { Feedback } from "../drafts/DraftsPanel";
import type { EditableDraft } from "./editableTypes";
import type { DraftEvaluation } from "./inputAdapters";
import { ItemsEditor } from "./ItemsEditor";

type CalculationFormProps = {
  draft: EditableDraft;
  calculation: DraftEvaluation;
  feedback: Feedback;
  touchedFields: ReadonlySet<string>;
  onDraftChange: (draft: EditableDraft) => void;
  onFieldBlur: (field: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onFillDemo: () => void;
  onPrint: () => void;
};

function updateDraftField<K extends keyof EditableDraft>(
  draft: EditableDraft,
  key: K,
  value: EditableDraft[K]
): EditableDraft {
  return { ...draft, [key]: value };
}

export function CalculationForm({
  draft,
  calculation,
  feedback,
  touchedFields,
  onDraftChange,
  onFieldBlur,
  onAddItem,
  onRemoveItem,
  onFillDemo,
  onPrint
}: CalculationFormProps) {
  const errors = calculation.fieldErrors;
  const getFieldError = (field: string) => (touchedFields.has(field) ? errors[field] : undefined);
  const canPrint = calculation.ok && calculation.input.projectName.trim() !== "";

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold leading-tight text-slate-950 md:text-[28px]">
              Расчёт коммерческого предложения
            </h1>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Работайте с черновиком локально: данные не отправляются на сервер.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end md:max-w-[360px] lg:max-w-none">
            <button
              className="min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-[15px] font-semibold text-slate-800 transition hover:bg-slate-50"
              type="button"
              onClick={onFillDemo}
            >
              Заполнить демо-пример
            </button>
            {canPrint ? (
              <button
                className="min-h-11 shrink-0 whitespace-nowrap rounded-lg bg-teal-700 px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-teal-800"
                type="button"
                onClick={onPrint}
              >
                Печать / сохранить PDF
              </button>
            ) : null}
          </div>
        </div>
        <p
          className={[
            "mt-5 rounded-lg px-4 py-3 text-[15px] leading-6",
            feedback.tone === "error"
              ? "bg-red-50 text-red-800"
              : feedback.tone === "success"
                ? "bg-teal-50 text-teal-800"
                : "bg-slate-50 text-slate-600"
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          {feedback.text}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold text-slate-950">О расчёте</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field id="projectName" label="Название проекта" error={getFieldError("projectName")}>
            {({ className, describedBy, invalid }) => (
              <input
                id="projectName"
                className={className}
                value={draft.projectName}
                onBlur={() => onFieldBlur("projectName")}
                onChange={(event) =>
                  onDraftChange(updateDraftField(draft, "projectName", event.target.value))
                }
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
          <Field
            id="clientDisplayName"
            label="Условное имя клиента"
            error={getFieldError("clientDisplayName")}
            hint="Используйте только условные или демо-данные."
          >
            {({ className, describedBy, invalid }) => (
              <input
                id="clientDisplayName"
                className={className}
                value={draft.clientDisplayName}
                onBlur={() => onFieldBlur("clientDisplayName")}
                onChange={(event) =>
                  onDraftChange(updateDraftField(draft, "clientDisplayName", event.target.value))
                }
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
          <Field
            id="clientContactNote"
            label="Заметка о клиенте"
            error={getFieldError("clientContactNote")}
            hint="Не вводите реальные телефоны, почту или персональные данные."
          >
            {({ className, describedBy, invalid }) => (
              <input
                id="clientContactNote"
                className={className}
                value={draft.clientContactNote}
                onBlur={() => onFieldBlur("clientContactNote")}
                onChange={(event) =>
                  onDraftChange(updateDraftField(draft, "clientContactNote", event.target.value))
                }
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
          <Field id="comment" label="Общий комментарий" error={getFieldError("comment")}>
            {({ className, describedBy, invalid }) => (
              <textarea
                id="comment"
                className={`${className} min-h-28 resize-y`}
                value={draft.comment}
                onBlur={() => onFieldBlur("comment")}
                onChange={(event) =>
                  onDraftChange(updateDraftField(draft, "comment", event.target.value))
                }
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
        </div>
      </section>

      <ItemsEditor
        calculation={calculation}
        draft={draft}
        getFieldError={getFieldError}
        onAddItem={onAddItem}
        onDraftChange={onDraftChange}
        onFieldBlur={onFieldBlur}
        onRemoveItem={onRemoveItem}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold text-slate-950">Скидки и налог</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)]">
          <div className="max-w-60">
            <Field
              id="overallDiscountPercentText"
              label="Общая скидка, %"
              error={getFieldError("overallDiscountPercentText")}
            >
              {({ className, describedBy, invalid }) => (
                <input
                  id="overallDiscountPercentText"
                  className={className}
                  inputMode="decimal"
                  value={draft.overallDiscountPercentText}
                  onBlur={() => onFieldBlur("overallDiscountPercentText")}
                  onChange={(event) =>
                    onDraftChange(
                      updateDraftField(draft, "overallDiscountPercentText", event.target.value)
                    )
                  }
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                />
              )}
            </Field>
          </div>
          <div className="min-w-0">
            <fieldset>
              <legend className="mb-2 text-[14px] font-semibold leading-5 text-slate-800">
                Налог
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] leading-6">
                  <input
                    type="radio"
                    name="taxMode"
                    checked={draft.taxMode === "none"}
                    onChange={() => onDraftChange(updateDraftField(draft, "taxMode", "none"))}
                  />
                  Без налога
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] leading-6">
                  <input
                    type="radio"
                    name="taxMode"
                    checked={draft.taxMode === "custom"}
                    onChange={() => onDraftChange(updateDraftField(draft, "taxMode", "custom"))}
                  />
                  Указать ставку
                </label>
              </div>
            </fieldset>
            <p className="mt-3 text-[13px] leading-5 text-slate-500">
              Ставку вводит пользователь. Это не бухгалтерская или юридическая рекомендация.
            </p>
          </div>
          {draft.taxMode === "custom" ? (
            <div className="max-w-60">
              <Field
                id="taxRatePercentText"
                label="Ставка налога, %"
                error={getFieldError("taxRatePercentText")}
              >
                {({ className, describedBy, invalid }) => (
                  <input
                    id="taxRatePercentText"
                    className={className}
                    inputMode="decimal"
                    value={draft.taxRatePercentText}
                    onBlur={() => onFieldBlur("taxRatePercentText")}
                    onChange={(event) =>
                      onDraftChange(updateDraftField(draft, "taxRatePercentText", event.target.value))
                    }
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                  />
                )}
              </Field>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
