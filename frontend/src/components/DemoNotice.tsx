export function DemoNotice() {
  return (
    <section
      aria-label="Важное предупреждение"
      className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-[15px] leading-6 text-amber-950 shadow-sm sm:px-6"
    >
      <h2 className="text-lg font-semibold">Демонстрационный инструмент</h2>
      <p className="mt-2 max-w-6xl">
        Не вводите реальные персональные, коммерческие или конфиденциальные данные.
        Расчёты нужно проверять самостоятельно; налоговую ставку задаёт пользователь.
        QuoteFlow не заменяет бухгалтерское, налоговое или юридическое сопровождение.
      </p>
    </section>
  );
}
