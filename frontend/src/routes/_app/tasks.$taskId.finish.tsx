/* eslint-disable react-refresh/only-export-components */
import {
  createFileRoute,
  Link,
  notFound,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { ApiError } from "../../lib/api";
import { useSuspenseQuery, type QueryClient } from "@tanstack/react-query";
import { taskQueryOptions } from "../../features/tasks/tasks.api";
import { type Task } from "../../features/tasks/task.schemas";
import { FinishTaskForm } from "../../features/tasks/FinishTaskForm";

async function loadTask(queryClient: QueryClient, taskId: string): Promise<Task> {
  try {
    return await queryClient.query(taskQueryOptions(taskId));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
      throw notFound();
    }
    throw error;
  }
}

export const Route = createFileRoute("/_app/tasks/$taskId/finish")({
  loader: async ({ context, params }) => {
    const task = await loadTask(context.queryClient, params.taskId);
    if (task.completedAt) throw redirect({ to: "/" });
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Task not found</h1>
      <p className="mt-2 text-muted">It may have been deleted.</p>
      <Link
        to="/"
        className="mt-4 inline-block font-semibold text-accent hover:text-accent-ink">
        Back to today
      </Link>
    </div>
  ),
  component: FinishTaskPage,
});

function FinishTaskPage() {
  const { taskId } = Route.useParams();
  const { data: task } = useSuspenseQuery(taskQueryOptions(taskId));
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link to="/" className="text-sm font-semibold text-accent hover:text-accent-ink">
          <span aria-hidden="true">← </span>Back to today
        </Link>
        <p className="mt-4 text-sm text-muted">Task finished</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{task.title}</h1>
      </div>

      <FinishTaskForm task={task} onDone={() => navigate({ to: "/" })} />
    </div>
  );
}
