import { useReopenTask } from "./tasks.api";
import type { Task } from "./task.schemas";
import { CheckBox } from "../../components/ui/CheckBox";
import { Link } from "@tanstack/react-router";
// 44px tap area around the 24px box
const checkTargetClasses =
  "flex size-11 flex-none items-center justify-center rounded-lg hover:bg-ink/5";

export function TaskRow({ task }: { task: Task }) {
  const reopenTask = useReopenTask();
  const isDone = task.completedAt !== null;
  const meta = [
    task.subject?.name,
    task.estimatedMinutes && `${task.estimatedMinutes} min`,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <li className="flex items-center gap-1 border-t border-line-soft py-2">
      {isDone ? (
        <button
          type="button"
          onClick={() => reopenTask.mutate(task.id)}
          disabled={reopenTask.isPending}
          aria-label={`Reopen: ${task.title}`}
          className={`${checkTargetClasses} disabled:opacity-60`}>
          <CheckBox checked />
        </button>
      ) : (
        <Link
          to="/tasks/$taskId/finish"
          params={{ taskId: task.id }}
          aria-label={`Mark done: ${task.title}`}
          className={checkTargetClasses}>
          <CheckBox checked={false} />
        </Link>
      )}

      <div className="min-w-0 flex-1 pl-2">
        <p className={`font-medium ${isDone ? "text-muted line-through" : ""}`}>
          {isDone && <span className="sr-only">Completed: </span>}
          {task.title}
        </p>
        {meta && <p className="text-sm text-muted">{meta}</p>}
        {reopenTask.isError && (
          <p role="alert" className="text-sm font-medium text-warning">
            The task could not be reopened. Please try again.
          </p>
        )}
      </div>
    </li>
  );
}
