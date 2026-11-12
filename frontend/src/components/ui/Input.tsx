import { useId } from "react";
import type { ComponentProps } from "react";

type InputProps = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-error` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const inputClasses = [
    "min-h-11 w-full rounded-lg border bg-surface px-3 text-base text-ink",
    "placeholder:text-muted disabled:bg-paper disabled:text-muted",
    error ? "border-warning" : "border-field",
  ].join(" ");

  return (
    <div className={["flex flex-col gap-1", className].filter(Boolean).join(" ")}>
      {/* Label */}
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>

      {/* Input */}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClasses}
        {...props}
      />

      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm font-medium text-warning">
          {error}
        </p>
      )}
    </div>
  );
}
