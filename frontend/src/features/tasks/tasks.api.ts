import {
  QueryClient,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CompleteTaskInput,
  CompleteTaskResponse,
  CreateTaskInput,
  TaskResponse,
  TasksResponse,
  TaskStatus,
  UpdateTaskInput,
  Confidence,
} from "./task.schemas";
import { api } from "../../lib/api";

export const taskKeys = {
  all: ["tasks"] as const,
  list: (status: TaskStatus) => ["tasks", "list", status] as const,
  detail: (id: string) => ["tasks", "detail", id] as const,
};

export function tasksQueryOptions(status: TaskStatus = "all") {
  return queryOptions({
    queryKey: taskKeys.list(status),
    queryFn: async ({ signal }) => {
      const { tasks } = await api.get<TasksResponse>(`/tasks?status=${status}`, signal);
      return tasks;
    },
  });
}

export function taskQueryOptions(id: string) {
  return queryOptions({
    queryKey: taskKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { task } = await api.get<TaskResponse>(`/tasks/${id}`, signal);
      return task;
    },
  });
}

export type FirstReviewOptions = Record<Confidence, number>;

export const firstReviewOptionsQueryOptions = queryOptions({
  queryKey: ["scheduling", "first-review-options"],
  queryFn: async ({ signal }) => {
    const { options } = await api.get<{ options: FirstReviewOptions }>(
      "/scheduling/first-review-options",
      signal,
    );
    return options;
  },
  // The suggestion only changes once a day, so there's no need to refetch it often
  staleTime: 60 * 60_000,
});

function invalidateTaskData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: taskKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["subjects"] }),
    queryClient.invalidateQueries({ queryKey: ["topics"] }),
  ]);
}

function useTaskMutation<Tvariables, TData>(
  mutationFn: (variables: Tvariables) => Promise<TData>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => invalidateTaskData(queryClient),
  });
}

export const useCreateTask = () =>
  useTaskMutation((input: CreateTaskInput) => api.post<TaskResponse>("/tasks", input));

export const useUpdateTask = () =>
  useTaskMutation(({ id, ...changes }: UpdateTaskInput) =>
    api.patch<TaskResponse>(`/tasks/${id}`, changes),
  );

export const useDeleteTask = () =>
  useTaskMutation((id: string) => api.delete<void>(`/tasks/${id}`));

export const useCompleteTask = () =>
  useTaskMutation(({ id, ...input }: CompleteTaskInput) =>
    api.post<CompleteTaskResponse>(`/tasks/${id}/complete`, input),
  );

export const useReopenTask = () =>
  useTaskMutation((id: string) => api.post<TaskResponse>(`/tasks/${id}/reopen`));
