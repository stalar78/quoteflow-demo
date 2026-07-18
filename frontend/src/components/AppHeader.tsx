type AppHeaderProps = {
  onNew: () => void;
};

export function AppHeader({ onNew }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 md:min-h-[72px] md:flex-row md:items-center md:justify-between lg:px-8 xl:px-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xl font-semibold tracking-normal text-slate-950 md:text-[26px]">
              QuoteFlow
            </p>
            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[13px] font-semibold text-teal-800">
              Демо · Stage 3
            </span>
          </div>
          <p className="mt-1 text-[15px] leading-6 text-slate-600">
            A Stalar Vision demo product
          </p>
        </div>
        <button
          className="min-h-11 rounded-lg bg-teal-700 px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-teal-800"
          type="button"
          onClick={onNew}
        >
          Новый расчёт
        </button>
      </div>
    </header>
  );
}
