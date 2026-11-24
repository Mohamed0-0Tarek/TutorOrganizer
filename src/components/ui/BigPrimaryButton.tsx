import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function BigPrimaryButton({
  children,
  className,
  variant = "primary",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  return (
    <button
      type="button"
      className={cn(
        "press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-btn px-4 text-[15px] font-semibold disabled:pointer-events-none disabled:opacity-50",
        variant === "primary"
          ? "bg-primary text-white shadow-[0_8px_20px_rgba(107,143,123,0.25)]"
          : "bg-white/60 text-ink border border-white/70",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
