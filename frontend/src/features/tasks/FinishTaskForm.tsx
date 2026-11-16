import { useState } from "react";
import type { Confidence } from "./task.schemas";
import {
  CONFIDENCE_LEVELS,
  completeTaskFormSchema,
  topicNameSchema,
} from "./task.schemas";
import { useCompleteTask } from "./tasks.api";
import type { SubmitEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Task } from "./task.schemas";

const MAX_TOPICS = 10;
const MAX_REVIEW_DAYS = 60;

const CONFIDENCE_DETAILS: Record<
  Confidence,
  { label: string; days: number; reason: string }
> = {
  shaky: {
    label: "Shaky",
    days: 1,
    reason: "This feels shaky, so a quick return tomorrow catches it before it fades.",
  },
  okay: {
    label: "Okay",
    days: 2,
    reason:
      "You know this reasonably well, so a short gap makes recall take some effort.",
  },
  solid: {
    label: "Solid",
    days: 4,
    reason: "This feels solid, so a longer gap makes the first recall a real test.",
  },
};

function formatDayLabel(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

type FinishTaskFormProps = {
  task: Task;
  onDone: (summary: { topicCount: number; reviewInDays: number }) => void;
};

export function FinishTaskForm({ task, onDone }: FinishTaskFormProps) {
  const completeTask = useCompleteTask();
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [topicError, setTopicError] = useState<string>();
  const [confidence, setConfidence] = useState<Confidence>("okay");
  const [dayAdjustment, setDayAdjustment] = useState(0);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string>();

  // Calculated from state on every render, so it's never out of sync
  const baseDays = CONFIDENCE_DETAILS[confidence].days;

  const reviewInDays = Math.min(MAX_REVIEW_DAYS, Math.max(1, baseDays + dayAdjustment));

  function addTopic(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = topicNameSchema.safeParse(topicInput);
    if (!result.success) {
      setTopicError(result.error.issues[0]?.message);
      return;
    }

    const name = result.data;

    if (topics.some((topic) => topic.toLowerCase() === name.toLowerCase())) {
      setTopicError("You already added this topic");
      return;
    }

    if (topics.length >= MAX_TOPICS) {
      setTopicError(`You can add up to ${MAX_TOPICS} topics`);
      return;
    }

    setTopics([...topics, name]);
    setTopicInput("");
    setTopicError(undefined);
  }

  function removeTopic(name: string) {
    setTopics(topics.filter((topic) => topic !== name));
  }

  function chooseConfidence(level: Confidence) {
    setConfidence(level);
    setDayAdjustment(0);
  }

  function submit(topicsToSchedule: string[]) {
    const result = completeTaskFormSchema.safeParse({
      topics: topicsToSchedule,
      confidence,
      note,
      reviewInDays,
    });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message);
      return;
    }

    setFormError(undefined);

    completeTask.mutate(
      {
        id: task.id,
        ...result.data,
      },
      {
        onSuccess: () =>
          onDone({
            topicCount: result.data.topics.length,
            reviewInDays,
          }),
      },
    );
  }

  const isSkipping =
    completeTask.isPending && completeTask.variables?.topics.length === 0;
  const isFinishing = completeTask.isPending && !isSkipping;
  const errorMessage = formError ?? completeTask.error?.message;

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6">
      {errorMessage && (
        <div role="alert" className="rounded-lg bg-notice px-4 py-3 text-sm font-medium">
          {errorMessage}
        </div>
      )}

      {/* Its own form, so pressing Enter adds a topic instead of finishing the task */}
      <form onSubmit={addTopic} noValidate className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label="Which topics did you study?"
            value={topicInput}
            onChange={(event) => setTopicInput(event.target.value)}
            placeholder="Hash joins"
            autoComplete="off"
            error={topicError}
            className="min-w-0 flex-[1_1_240px]"
          />
          <Button type="submit" variant="secondary">
            Add topic
          </Button>
        </div>

        {topics.length > 0 && (
          <ul aria-label="Topics to schedule" className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <li key={topic}>
                <button
                  type="button"
                  onClick={() => removeTopic(topic)}
                  aria-label={`Remove ${topic}`}
                  className="min-h-9 rounded-full bg-accent-soft px-3 font-medium text-accent-ink hover:bg-line-soft">
                  {topic} <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <div role="group" aria-labelledby="confidence-heading">
        <p id="confidence-heading" className="mb-2 font-semibold">
          How well do you know it right now?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CONFIDENCE_LEVELS.map((level) => {
            const isSelected = confidence === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => chooseConfidence(level)}
                aria-pressed={isSelected}
                className={`min-h-11 rounded-lg border font-semibold ${
                  isSelected
                    ? "border-ink bg-ink text-white"
                    : "border-field bg-surface text-ink"
                }`}>
                {CONFIDENCE_DETAILS[level].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="finish-note" className="text-sm font-semibold">
          Note to your future self (optional)
        </label>
        <textarea
          id="finish-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="I keep mixing up build and probe phases"
          className="w-full resize-y rounded-lg border border-field bg-surface px-3 py-2 text-base text-ink placeholder:text-muted"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-accent-soft p-4">
        <p className="text-sm font-semibold text-accent-ink">Suggested first review</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-2xl font-bold">
            {formatDayLabel(reviewInDays)}{" "}
            <span className="text-base font-medium text-muted">
              (in {reviewInDays} {reviewInDays === 1 ? "day" : "days"})
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              aria-label="One day earlier"
              onClick={() => setDayAdjustment(dayAdjustment - 1)}
              disabled={reviewInDays <= 1}
              className="w-11 px-0 text-xl">
              −
            </Button>
            <Button
              variant="secondary"
              aria-label="One day later"
              onClick={() => setDayAdjustment(dayAdjustment + 1)}
              disabled={reviewInDays >= MAX_REVIEW_DAYS}
              className="w-11 px-0 text-xl">
              +
            </Button>
          </div>
        </div>
        <p className="text-sm text-ink-soft">
          {CONFIDENCE_DETAILS[confidence].reason}
          {dayAdjustment !== 0 && " You adjusted the date by hand."}
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => submit([])}
          isLoading={isSkipping}
          disabled={completeTask.isPending}>
          Skip, nothing to review
        </Button>
        <Button
          onClick={() => submit(topics)}
          isLoading={isFinishing}
          disabled={topics.length === 0 || completeTask.isPending}>
          Finish and schedule
        </Button>
      </div>
    </section>
  );
}
