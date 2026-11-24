import { cn } from "@/lib/cn";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "press shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium",
            value === option.value
              ? "bg-primary text-white"
              : "bg-white/55 text-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
