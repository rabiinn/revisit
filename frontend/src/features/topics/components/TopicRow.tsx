import { useId, useState } from "react";
import { daysUntil, dueLabel } from "../topicDates";
import type { Topic } from "../topics.api";

// FSRS schedules each review for when your chance of remembering drops to about 90%
function memoryLevel(recallProbability: number) {
  if (recallProbability >= 0.9) return { label: "strong", barClass: "bg-accent" };
  if (recallProbability >= 0.85) return { label: "building", barClass: "bg-accent" };
  return { label: "fading", barClass: "bg-warning" };
}

export function TopicRow({ topic }: { topic: Topic }) {
  const [isOpen, setIsOpen] = useState(false);
  const detailsId = useId();

  const days = daysUntil(topic.dueAt);
  const recall = Math.round(topic.recallProbability * 100);
  const memory = memoryLevel(topic.recallProbability);

  return (
    <li className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={detailsId}
        className="flex min-h-16 w-full flex-wrap items-center gap-x-6 gap-y-3 rounded-xl px-4 py-3 text-left hover:bg-paper">
        <span className="min-w-0 flex-[999_1_260px]">
          <span className="block font-semibold">{topic.name}</span>
          <span className="block text-sm text-muted">
            {topic.subject?.name ?? "No subject"}
          </span>
        </span>

        <span className="min-w-0 flex-[1_1_180px]">
          <span className="block text-[13px] text-muted">
            Memory: {memory.label}, {recall}%
          </span>
          <span
            aria-hidden="true"
            className="mt-1 block h-2 overflow-hidden rounded bg-line-soft">
            <span
              className={`block h-2 ${memory.barClass}`}
              style={{ width: `${recall}%` }}
            />
          </span>
        </span>

        <span
          className={`flex-[0_1_150px] font-mono text-[13px] ${
            days <= 0 ? "text-warning" : "text-muted"
          }`}>
          {dueLabel(days)}
        </span>
      </button>

      <div
        id={detailsId}
        hidden={!isOpen}
        className="flex flex-col gap-1 border-t border-line-soft px-4 py-3 text-sm text-ink-soft">
        <p>Studied in: {topic.task?.title ?? "A deleted task"}</p>
        <p>Your note: {topic.note ?? "None"} </p>
        <p>
          Reviewed {topic.reps} {topic.reps === 1 ? "time" : "times"}, forgotten{" "}
          {topic.lapses} {topic.lapses === 1 ? "time" : "times"}
        </p>
      </div>
    </li>
  );
}
