import { Link } from "@tanstack/react-router";
import { CheckBox } from "../../components/ui/CheckBox";
import type { Task } from "./task.schemas";
import { useDeleteTask, useReopenTask } from "./tasks.api";
import { TrashIcon } from "../../components/ui/TrashIcon";

// 44px tap area around the 24px box
const checkTargetClasses =
  "flex size-11 flex-none items-center justify-center rounded-lg hover:bg-ink/5";

export function TaskRow({ task }: { task: Task }) {
  const reopenTask = useReopenTask();
  const deleteTask = useDeleteTask();

  const isDone = task.completedAt !== null;
  const meta = [
    task.subject?.name,
    task.estimatedMinutes && `${task.estimatedMinutes} min`,
  ]
    .filter(Boolean)
    .join(" / ");

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${task.title}"?\n\nTopics you logged from it stay scheduled.`,
    );
    if (confirmed) deleteTask.mutate(task.id);
  }

  // Show whichever action failed, using the backend's own message
  const error = reopenTask.error ?? deleteTask.error;

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
        {error && (
          <p role="alert" className="text-sm font-medium text-warning">
            {error.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteTask.isPending}
        aria-label={`Delete: ${task.title}`}
        className="flex size-11 flex-none items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-warning disabled:opacity-60">
        <TrashIcon />
      </button>
    </li>
  );
}
