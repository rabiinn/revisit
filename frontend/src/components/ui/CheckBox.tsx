export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-6 items-center justify-center rounded-md border-2 ${
        checked ? "border-accent bg-accent" : "border-muted bg-surface"
      }`}>
      {checked && (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          className="size-4">
          <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
