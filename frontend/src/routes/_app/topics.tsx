/* eslint-disable react-refresh/only-export-components */
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { TopicRow } from "../../features/topics/components/TopicRow";
import { topicsQueryOptions } from "../../features/topics/topics.api";
import type { Topic } from "../../features/topics/topics.api";

const allTopicsQuery = topicsQueryOptions();

const filterClasses =
  "inline-flex min-h-11 items-center rounded-full border px-4 font-medium transition-colors";
const activeFilter = { className: "border-ink bg-ink text-white" };
const inactiveFilter = { className: "border-field bg-surface text-ink hover:border-ink" };

// Only subjects that have topics, in alphabetical order
function subjectsOf(topics: Topic[]) {
  const byId = new Map<string, { id: string; name: string }>();
  for (const topic of topics) {
    if (topic.subject) byId.set(topic.subject.id, topic.subject);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const Route = createFileRoute("/_app/topics")({
  validateSearch: z.object({
    // An invalid ID in the URL just shows all topics, instead of an error
    subject: z.uuid().optional().catch(undefined),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(allTopicsQuery),
  component: TopicsPage,
});

function TopicsPage() {
  const { subject: selectedSubjectId } = Route.useSearch();
  const { data: topics } = useSuspenseQuery(allTopicsQuery);

  const subjects = subjectsOf(topics);
  const visibleTopics = selectedSubjectId
    ? topics.filter((topic) => topic.subject?.id === selectedSubjectId)
    : topics;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Everything you have studied</h1>
        <p className="mt-2 text-muted">
          Your topics, how well you remember them, and when to review them next.
        </p>
      </div>

      {topics.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface p-6">
          <p>Nothing here yet. Finish a task and log what you studied.</p>
          <Link
            to="/"
            className="mt-3 inline-block font-semibold text-accent hover:text-accent-ink">
            Go to today
          </Link>
        </section>
      ) : (
        <>
          <nav aria-label="Filter by subject" className="flex flex-wrap gap-2">
            <Link
              to="/topics"
              search={{}}
              resetScroll={false}
              activeOptions={{ exact: true, includeSearch: true }}
              className={filterClasses}
              activeProps={activeFilter}
              inactiveProps={inactiveFilter}>
              All
            </Link>
            {subjects.map((subject) => (
              <Link
                key={subject.id}
                to="/topics"
                search={{ subject: subject.id }}
                resetScroll={false}
                activeOptions={{ exact: true, includeSearch: true }}
                className={filterClasses}
                activeProps={activeFilter}
                inactiveProps={inactiveFilter}>
                {subject.name}
              </Link>
            ))}
          </nav>

          {visibleTopics.length === 0 ? (
            <p className="text-muted">No topics in this subject.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleTopics.map((topic) => (
                <TopicRow key={topic.id} topic={topic} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
