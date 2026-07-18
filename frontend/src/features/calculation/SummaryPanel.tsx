import type { DraftEvaluation } from "./inputAdapters";
import { formatMoney } from "./inputAdapters";

type SummaryPanelProps = {
  calculation: DraftEvaluation;
};

export function SummaryPanel({ calculation }: SummaryPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-slate-950">Итог</h2>
      {!calculation.ok ? (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-[15px] leading-6 text-slate-700">
          <p className="text-base font-semibold text-slate-900">
            {calculation.reason === "incomplete"
              ? "Черновик пока неполный."
              : "Итог не рассчитан."}
          </p>
          <p className="mt-2">{calculation.message}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <SummaryRow label="Подытог" value={formatMoney(calculation.result.subtotalMinor)} />
          <SummaryRow
            label="Общая скидка"
            value={formatMoney(calculation.result.overallDiscountMinor)}
          />
          <SummaryRow
            label="После скидки"
            value={formatMoney(calculation.result.amountAfterDiscountMinor)}
          />
          <SummaryRow label="Налог" value={formatMoney(calculation.result.taxMinor)} />
          <div className="mt-5 rounded-xl bg-teal-950 p-5 text-white">
            <p className="text-[15px] font-medium text-teal-50">Всего</p>
            <p className="mt-2 break-words text-3xl font-semibold tabular-nums">
              {formatMoney(calculation.result.totalMinor)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 text-[15px] leading-6">
      <span className="text-slate-600">{label}</span>
      <span className="break-words text-right font-semibold tabular-nums text-slate-950">{value}</span>
    </div>
  );
}
