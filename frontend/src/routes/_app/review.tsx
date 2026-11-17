/* eslint-disable react-refresh/only-export-components */
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RecallSession } from "../../features/topics/components/RecallSession";
import { topicsQueryOptions } from "../../features/topics/topics.api";

const dueTopicsQuery = topicsQueryOptions({ dueOnly: true });

export const Route = createFileRoute("/_app/review")({
  // Ask the backend again, so the session starts from what's really due now
  loader: ({ context }) => context.queryClient.fetchQuery(dueTopicsQuery),
  component: ReviewPage,
});

function ReviewPage() {
  const { data: dueTopics } = useSuspenseQuery(dueTopicsQuery);
  return <RecallSession topics={dueTopics} />;
}
