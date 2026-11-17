import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { useReviewTopic } from "../topics.api";
import type { ReviewRating, Topic } from "../topics.api";

const RATING_BUTTONS: { rating: ReviewRating; label: string }[] = [
  { rating: "again", label: "Forgot" },
  { rating: "hard", label: "Hard" },
  { rating: "good", label: "Good" },
  { rating: "easy", label: "Easy" },
];

const linkButtonClasses =
  "inline-flex min-h-11 items-center rounded-lg bg-accent px-5 font-semibold text-white hover:bg-accent-ink";

function formatInterval(days: number) {
  if (days === 1) return "1 day";
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

export function RecallSession({ topics }: { topics: Topic[] }) {
  // Keep the list from when the session started, even as the due list refetches
  const [queue] = useState(topics);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const reviewTopic = useReviewTopic();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const topic = queue[index];

  // Move keyboard and screen reader focus to the new topic's heading
  useEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  function rate(rating: ReviewRating) {
    if (!topic) return;

    reviewTopic.mutate(
      { topicId: topic.id, rating },
      {
        onSuccess: () => {
          setIndex((current) => current + 1);
          setAnswer("");
          setIsRevealed(false);
        },
      },
    );
  }

  if (!topic) {
    return (
      <section className="mx-auto mt-12 flex max-w-xl flex-col items-start gap-4 rounded-xl border border-line bg-surface p-8">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold tracking-tight">
          {queue.length === 0 ? "Nothing to review right now" : "Session finished"}
        </h1>
        <p>
          {queue.length === 0
            ? "You're up to date. New topics appear here when they're due."
            : `Topics reviewed: ${queue.length}. Each one has a new review date, based on how the recall went.`}
        </p>
        <Link to="/" className={linkButtonClasses}>
          Back to today
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm text-muted">
          Topic {index + 1} of {queue.length}
        </p>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ink/5">
          End session
        </Link>
      </div>

      <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6">
        <div>
          <p className="text-sm text-muted">
            {topic.subject?.name ?? "No subject"}
            {topic.task && ` / from "${topic.task.title}"`}
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-2xl font-bold tracking-tight">
            Explain "{topic.name}" in your own words.
          </h1>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="recall-answer" className="font-semibold">
            Answer from memory, before you look
          </label>
          <textarea
            id="recall-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-field bg-surface px-3 py-2 text-base text-ink"
          />
        </div>

        {!isRevealed ? (
          <Button size="lg" onClick={() => setIsRevealed(true)}>
            Check my answer
          </Button>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-paper p-4">
              <p className="text-sm font-semibold text-muted">Compare with your notes</p>
              <p className="mt-1">
                {topic.note
                  ? `You noted: ${topic.note}`
                  : "Open your notes for this topic, and check what you missed."}
              </p>
            </div>

            <div role="group" aria-labelledby="rating-heading">
              <p id="rating-heading" className="mb-2 font-semibold">
                How did that go?
              </p>

              {reviewTopic.error && (
                <p
                  role="alert"
                  className="mb-2 rounded-lg bg-notice px-4 py-3 text-sm font-medium">
                  {reviewTopic.error.message}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RATING_BUTTONS.map(({ rating, label }) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => rate(rating)}
                    disabled={reviewTopic.isPending}
                    className="flex min-h-16 flex-col items-center justify-center rounded-lg border border-ink bg-surface p-2 hover:bg-paper disabled:opacity-60">
                    <span className="font-semibold">{label}</span>
                    <span className="font-mono text-[13px] text-muted">
                      {formatInterval(topic.reviewOptions[rating])}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
