/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/topics")({
  component: TopicsPage,
});

function TopicsPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight">Everything you have studied</h1>
      <p className="mt-2 text-muted">Your topics, how well you remember them, and when to review them next.</p>
    </div>
  );
}
