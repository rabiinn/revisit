export const CONFIDENCE_LEVELS = ["shaky", "okay", "solid"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

// How soon to review a topic first, based on how well you know it
const INITIAL_SCHEDULE: Record<Confidence, { days: number; strength: number }> =
  {
    shaky: { days: 1, strength: 25 },
    okay: { days: 2, strength: 45 },
    solid: { days: 4, strength: 65 },
  };

// Midnight UTC, the given number of days from today
export function daysFromToday(days: number, now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days),
  );
}

// Calculates due date and strength of a task based upon confidence
export function initialSchedule(confidence: Confidence, overrideDays?: number) {
  const { days, strength } = INITIAL_SCHEDULE[confidence];
  const intervalDays = overrideDays ?? days;

  return { strength, intervalDays, dueAt: daysFromToday(intervalDays) };
}

export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

const MAX_INTERVAL_DAYS = 365;

const STRENGTH_CHANGE: Record<ReviewRating, number> = {
  again: -20,
  hard: 3,
  good: 12,
  easy: 20,
};

// Rating: How Well the user remembered the topic
// currentInterval: How many days until the topic was previously scheduled for review
// returns next intervalDays
export function nextIntervalDays(
  rating: ReviewRating,
  currentInterval: number,
) {
  const next = {
    again: 1,
    hard: Math.max(2, Math.round(currentInterval * 1.2)),
    good: Math.max(3, Math.round(currentInterval * 2.2)),
    easy: Math.max(5, Math.round(currentInterval * 3.2)),
  }[rating];

  return Math.min(next, MAX_INTERVAL_DAYS);
}

// The interval each rating button would give, for the frontend labels
export function reviewOptions(currentInterval: number) {
  return Object.fromEntries(
    REVIEW_RATINGS.map((rating) => [
      rating,
      nextIntervalDays(rating, currentInterval),
    ]),
  ) as Record<ReviewRating, number>;
}

export function scheduleReview(
  topic: { intervalDays: number; strength: number },
  rating: ReviewRating,
  now = new Date(),
) {
  const intervalDays = nextIntervalDays(rating, topic.intervalDays);
  const strength = Math.min(
    100,
    Math.max(5, topic.strength + STRENGTH_CHANGE[rating]),
  );

  return { intervalDays, strength, dueAt: daysFromToday(intervalDays, now) };
}
