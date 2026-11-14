import type { Task } from "./task.schemas";
export function TaskRow({ task }: { task: Task }) {
  const isDone = task.completedAt !== null;
  const meta = [
    task.subject?.name,
    task.estimatedMinutes && `${task.estimatedMinutes} min`,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <li className="flex items-center gap-3 border-t border-line-soft py-3">
      <span
        aria-hidden="true"
        className={`flex size-6 flex-none items-center justify-center rounded-md border-2 ${
          isDone ? "border-accent bg-accent" : "border-muted bg-surface"
        }`}>
        {isDone && (
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

      <div className="min-w-0 flex-1">
        <p className={`font-medium ${isDone ? "text-muted line-through" : ""}`}>
          {isDone && <span className="sr-only">Completed: </span>}
          {task.title}
        </p>
        {meta && <p className="text-sm text-muted">{meta}</p>}
      </div>
    </li>
  );
}
