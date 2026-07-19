import type { EditableDraft } from "./editableTypes";
import type { DraftEvaluation } from "./inputAdapters";
import { formatMoney } from "./inputAdapters";

type PrintDocumentProps = {
  draft: EditableDraft;
  calculation: DraftEvaluation;
};

export function PrintDocument({ draft, calculation }: PrintDocumentProps) {
  if (!calculation.ok || calculation.input.projectName.trim() === "") {
    return null;
  }

  const lineById = new Map(calculation.result.items.map((line) => [line.itemId, line]));

  return (
    <section className="print-document hidden" aria-label="Печатная версия расчёта">
      <header>
        <h1>QuoteFlow</h1>
        <p>Демонстрационный документ</p>
      </header>

      <section className="print-keep-block">
        <h2>Проект</h2>
        <p>{calculation.input.projectName || "Без названия"}</p>
      </section>

      <section className="print-keep-block">
        <h2>Условный клиент</h2>
        <p>{calculation.input.client.displayName || "Не указан"}</p>
        {calculation.input.client.contactNote ? (
          <p>{calculation.input.client.contactNote}</p>
        ) : null}
      </section>

      <section className="print-items-section">
        <h2>Позиции</h2>
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Наименование</th>
              <th>Кол-во</th>
              <th>Цена</th>
              <th>Скидка</th>
              <th>Итого</th>
            </tr>
          </thead>
          <tbody>
            {calculation.input.items.map((item, index) => {
              const line = lineById.get(item.id);
              return (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.name}</strong>
                    {item.description ? <span>{item.description}</span> : null}
                  </td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>{formatMoney(item.unitPriceMinor)}</td>
                  <td>{formatPercent(item.discountBasisPoints)}</td>
                  <td>{line ? formatMoney(line.lineTotalMinor) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="print-keep-block">
        <h2>Итог</h2>
        <dl>
          <div>
            <dt>Подытог</dt>
            <dd>{formatMoney(calculation.result.subtotalMinor)}</dd>
          </div>
          <div>
            <dt>Общая скидка</dt>
            <dd>{formatMoney(calculation.result.overallDiscountMinor)}</dd>
          </div>
          <div>
            <dt>После скидки</dt>
            <dd>{formatMoney(calculation.result.amountAfterDiscountMinor)}</dd>
          </div>
          <div>
            <dt>Налог</dt>
            <dd>{formatMoney(calculation.result.taxMinor)}</dd>
          </div>
          <div>
            <dt>Всего</dt>
            <dd>{formatMoney(calculation.result.totalMinor)}</dd>
          </div>
        </dl>
      </section>

      {calculation.input.comment ? (
        <section className="print-keep-block">
          <h2>Комментарий</h2>
          <p>{calculation.input.comment}</p>
        </section>
      ) : null}

      <p>
        Расчёты необходимо проверять. QuoteFlow не заменяет бухгалтерское,
        налоговое или юридическое сопровождение.
      </p>
    </section>
  );
}

function formatPercent(value: number): string {
  const whole = Math.trunc(value / 100);
  const fraction = value % 100;
  return fraction === 0 ? `${whole}%` : `${whole},${String(fraction).padStart(2, "0")}%`;
}
