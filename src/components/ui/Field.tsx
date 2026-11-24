import type { ReactNode } from "react";

export const inputClass =
  "min-h-12 w-full rounded-btn border border-white/80 bg-white/70 px-3 text-[15px] text-ink outline-none placeholder:text-muted/80 focus:border-primary/60";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] leading-5 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
