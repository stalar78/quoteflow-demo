import { Field } from "../../components/Field";
import type { EditableDraft, EditableItem } from "./editableTypes";
import type { DraftEvaluation } from "./inputAdapters";
import { formatMoney } from "./inputAdapters";

type ItemsEditorProps = {
  draft: EditableDraft;
  calculation: DraftEvaluation;
  getFieldError: (field: string) => string | undefined;
  onDraftChange: (draft: EditableDraft) => void;
  onFieldBlur: (field: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
};

const unitSuggestions = ["шт.", "час", "услуга", "день", "месяц"];

export function ItemsEditor({
  draft,
  calculation,
  getFieldError,
  onDraftChange,
  onFieldBlur,
  onAddItem,
  onRemoveItem
}: ItemsEditorProps) {
  function updateItem(id: string, patch: Partial<EditableItem>) {
    onDraftChange({
      ...draft,
      items: draft.items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Позиции</h2>
          <p className="mt-1.5 text-[15px] leading-6 text-slate-600">
            Минимум одна позиция остаётся в расчёте.
          </p>
        </div>
        <button
          className="min-h-11 shrink-0 rounded-lg bg-teal-700 px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-teal-800"
          type="button"
          onClick={onAddItem}
        >
          Добавить позицию
        </button>
      </div>
      <datalist id="unit-suggestions">
        {unitSuggestions.map((unit) => (
          <option value={unit} key={unit} />
        ))}
      </datalist>
      <div className="mt-5 flex flex-col gap-5">
        {draft.items.map((item, index) => {
          const prefix = `items.${item.id}`;
          const line = calculation.ok
            ? calculation.result.items.find((candidate) => candidate.itemId === item.id)
            : undefined;

          return (
            <article
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-5"
              key={item.id}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="min-w-0 truncate text-lg font-semibold text-slate-900">
                  Позиция {index + 1}
                </h3>
                <button
                  className="min-h-10 shrink-0 whitespace-nowrap rounded-lg border border-red-200 bg-white px-3.5 py-2 text-[14px] font-semibold text-red-700 transition hover:bg-red-50"
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                >
                  Удалить
                </button>
              </div>

              <div className="mt-5 grid gap-5">
                <div className="grid gap-5 xl:grid-cols-[minmax(260px,4fr)_minmax(360px,6fr)]">
                  <Field id={`${prefix}.name`} label="Название" error={getFieldError(`${prefix}.name`)}>
                    {({ className, describedBy, invalid }) => (
                      <input
                        id={`${prefix}.name`}
                        className={className}
                        value={item.name}
                        onBlur={() => onFieldBlur(`${prefix}.name`)}
                        onChange={(event) => updateItem(item.id, { name: event.target.value })}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                      />
                    )}
                  </Field>
                  <Field
                    id={`${prefix}.description`}
                    label="Описание"
                    error={getFieldError(`${prefix}.description`)}
                  >
                    {({ className, describedBy, invalid }) => (
                      <input
                        id={`${prefix}.description`}
                        className={className}
                        value={item.description}
                        onBlur={() => onFieldBlur(`${prefix}.description`)}
                        onChange={(event) =>
                          updateItem(item.id, { description: event.target.value })
                        }
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                      />
                    )}
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-[minmax(120px,1fr)_minmax(140px,1fr)_minmax(180px,1.4fr)_minmax(140px,1fr)]">
                  <Field
                    id={`${prefix}.quantityText`}
                    label="Количество"
                    error={getFieldError(`${prefix}.quantityText`)}
                  >
                    {({ className, describedBy, invalid }) => (
                      <input
                        id={`${prefix}.quantityText`}
                        className={className}
                        inputMode="decimal"
                        value={item.quantityText}
                        onBlur={() => onFieldBlur(`${prefix}.quantityText`)}
                        onChange={(event) => updateItem(item.id, { quantityText: event.target.value })}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                      />
                    )}
                  </Field>
                  <Field id={`${prefix}.unit`} label="Единица" error={getFieldError(`${prefix}.unit`)}>
                    {({ className, describedBy, invalid }) => (
                      <input
                        id={`${prefix}.unit`}
                        className={className}
                        list="unit-suggestions"
                        value={item.unit}
                        onBlur={() => onFieldBlur(`${prefix}.unit`)}
                        onChange={(event) => updateItem(item.id, { unit: event.target.value })}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                      />
                    )}
                  </Field>
                  <Field
                    id={`${prefix}.unitPriceRublesText`}
                    label="Цена, ₽"
                    error={getFieldError(`${prefix}.unitPriceRublesText`)}
                  >
                    {({ className, describedBy, invalid }) => (
                      <input
                        id={`${prefix}.unitPriceRublesText`}
                        className={className}
                        inputMode="decimal"
                        value={item.unitPriceRublesText}
                        onBlur={() => onFieldBlur(`${prefix}.unitPriceRublesText`)}
                        onChange={(event) =>
                          updateItem(item.id, { unitPriceRublesText: event.target.value })
                        }
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                      />
                    )}
                  </Field>
                  <Field
                    id={`${prefix}.discountPercentText`}
                    label="Скидка, %"
                    error={getFieldError(`${prefix}.discountPercentText`)}
                  >
                    {({ className, describedBy, invalid }) => (
                      <input
                        id={`${prefix}.discountPercentText`}
                        className={className}
                        inputMode="decimal"
                        value={item.discountPercentText}
                        onBlur={() => onFieldBlur(`${prefix}.discountPercentText`)}
                        onChange={(event) =>
                          updateItem(item.id, { discountPercentText: event.target.value })
                        }
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                      />
                    )}
                  </Field>
                </div>

                <div className="flex flex-col gap-2 rounded-lg bg-white px-4 py-3 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[14px] font-semibold text-slate-600">Итого по позиции</p>
                  <output
                    aria-label={`Итого по позиции ${index + 1}`}
                    className="break-words text-left text-lg font-semibold tabular-nums text-slate-950 sm:text-right"
                  >
                    {line ? formatMoney(line.lineTotalMinor) : "Заполните обязательные поля"}
                  </output>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
