/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { tasksQueryOptions } from "../../features/tasks/tasks.api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { TaskRow } from "../../features/tasks/TaskRow";
export const Route = createFileRoute("/_app/")({
  loader: ({ context }) => context.queryClient.query(tasksQueryOptions()),
  errorComponent: () => (
    <p role="alert" className="rounded-lg bg-notice px-4 py-3 font-medium">
      Your tasks could not be loaded. Please refresh the page.
    </p>
  ),

  component: TodayPage,
});

function plural(count: number, word: string) {
  return `${count}  ${word}${count === 1 ? "" : "s"}`;
}

function TodayPage() {
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions());

  const openCount = tasks.filter((task) => !task.completedAt).length;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-sm text-muted">{today}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight">
          {plural(openCount, "task")} to study
        </h1>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="tasks-heading"
          className="min-w-0 flex-[999_1_520px] rounded-xl border border-line bg-surface p-6">
          <h2 id="tasks-heading" className="text-xl font-semibold">
            Study tasks
          </h2>

          {tasks.length === 0 ? (
            <p className="mt-4 text-muted">No tasks yet. Add what you plan to study.</p>
          ) : (
            <ul className="mt-4">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </section>
        <section
          aria-labelledby="due-heading"
          className="min-w-0 flex-[1_1_340px] rounded-xl bg-ink p-6 text-white">
          <h2 id="due-heading" className="text-xl font-semibold">
            Due for recall
          </h2>
          <p className="mt-1 text-sm text-white/75">
            Topics due for review will appear here.
          </p>
        </section>
      </div>
    </div>
  );
}
