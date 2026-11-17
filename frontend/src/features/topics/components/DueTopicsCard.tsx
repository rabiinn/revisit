import type { Topic } from "../topics.api";

const DAY_MS = 24 * 60 * 60 * 1000;
// A rough estimate for the summary line
const MINUTES_PER_TOPIC = 3;

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// Whole UTC days from today to the due date: 0 is today, -2 is two days ago
function daysUntil(dueAt: string, now = new Date()) {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(dueAt).getTime() - todayUtc) / DAY_MS);
}

function dueLabel(days: number) {
  if (days < -1) return `${-days} days overdue`;
  if (days === -1) return "1 day overdue";
  return "Due today";
}

export function DueTopicsCard({ topics }: { topics: Topic[] }) {
  const summary =
    topics.length === 0
      ? "Nothing due. Tomorrow-you says thanks."
      : `${plural(topics.length, "topic")}, about ${topics.length * MINUTES_PER_TOPIC} minutes`;

  return (
    <section
      aria-labelledby="due-heading"
      className="min-w-0 flex-[1_1_340px] rounded-xl bg-ink p-6 text-white">
      <h2 id="due-heading" className="text-xl font-semibold">
        Due for recall
      </h2>
      <p className="mt-1 text-sm text-white/75">{summary}</p>

      {topics.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {topics.map((topic) => {
            const days = daysUntil(topic.dueAt);
            return (
              <li key={topic.id} className="rounded-lg bg-ink-soft p-3">
                <p className="font-medium">{topic.name}</p>
                <div className="flex flex-wrap justify-between gap-2 text-sm text-white/75">
                  <span>{topic.subject?.name ?? "No subject"}</span>
                  <span
                    className={`font-mono text-[13px] ${days < 0 ? "text-highlight" : ""}`}>
                    {dueLabel(days)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
