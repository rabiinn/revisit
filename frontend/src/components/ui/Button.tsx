import type { ComponentProps } from "react";
type ButtonVariant = "primary" | "secondary" | "ghost" | "highlight";
type ButtonSize = "md" | "lg";

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-ink",
  secondary: "border border-ink bg-surface text-ink hover:bg-paper",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  highlight: "bg-highlight text-ink hover:brightness-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-11 px-4",
  lg: "min-h-12 px-5",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  type = "button",
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classes}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
