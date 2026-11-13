/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: TodayPage,
});

function TodayPage() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <p className="font-mono text-sm text-muted">{today}</p>
      <h1 className="mt-1 text-4xl font-bold tracking-tight">Today</h1>
      <p className="mt-2 text-muted ">Your study tasks and due topics will appear here.</p>
    </div>
  );
}
