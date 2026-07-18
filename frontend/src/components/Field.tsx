import type { ReactNode } from "react";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (props: {
    describedBy: string | undefined;
    invalid: boolean;
    className: string;
  }) => ReactNode;
};

export function Field({ id, label, error, hint, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(error);

  return (
    <div className="min-w-0">
      <label className="mb-2 block text-[14px] font-semibold leading-5 text-slate-800" htmlFor={id}>
        {label}
      </label>
      {children({
        describedBy,
        invalid,
        className: [
          "min-h-11 w-full min-w-0 rounded-lg border bg-white px-3.5 py-2.5 text-[15px] leading-6 text-slate-900 shadow-sm transition placeholder:text-slate-400",
          invalid
            ? "border-red-400 focus:border-red-500"
            : "border-slate-300 focus:border-teal-600"
        ].join(" ")
      })}
      {hint ? (
        <p className="mt-2 text-[13px] leading-5 text-slate-500" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-[13px] leading-5 text-red-700" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
