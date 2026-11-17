import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type ReviewRating = "again" | "hard" | "good" | "easy";

// Matches what the backend sends. Dates arrive as ISO strings in JSON
export type Topic = {
  id: string;
  name: string;
  note: string | null;
  dueAt: string;
  lastReviewAt: string | null;
  reps: number;
  lapses: number;
  scheduledDays: number;
  // Your chance of remembering it today, from 0 to 1
  recallProbability: number;
  // Days until the next review for each rating button
  reviewOptions: Record<ReviewRating, number>;
  subject: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
};

export type TopicFilters = {
  dueOnly?: boolean;
  subjectId?: string;
};

type TopicsResponse = { topics: Topic[] };

export const topicKeys = {
  all: ["topics"] as const,
  list: (filters: TopicFilters) => ["topics", "list", filters] as const,
};

export function topicsQueryOptions(filters: TopicFilters = {}) {
  return queryOptions({
    queryKey: topicKeys.list(filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (filters.dueOnly) params.set("dueOnly", "true");
      if (filters.subjectId) params.set("subjectId", filters.subjectId);

      const query = params.size > 0 ? `?${params}` : "";
      const { topics } = await api.get<TopicsResponse>(`/topics${query}`, signal);
      return topics;
    },
  });
}

type ReviewTopicInput = {
  topicId: string;
  rating: ReviewRating;
};

export function useReviewTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, rating }: ReviewTopicInput) =>
      api.post<{ topic: Topic }>(`/topics/${topicId}/reviews`, { rating }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicKeys.all }),
  });
}
