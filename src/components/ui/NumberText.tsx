import { cn } from "@/lib/cn";

/** Digits always render as Latin numerals (D10) and align in columns. */
export function NumberText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>{children}</span>
  );
}
