import { dateChrono, defineScheduler, Rating } from "ts-fsrs";
import type { Grade, State } from "ts-fsrs";
import {
  schedulerDesiredRetentionMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
} from "ts-fsrs/middlewares";
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from "ts-fsrs/models/fsrs-7";

export const CONFIDENCE_LEVELS = ["shaky", "okay", "solid"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

const DESIRED_RETENTION = 0.9;
export const MAX_INTERVAL_DAYS = 365;
export const MAX_FIRST_INTERVAL_DAYS = 7;

// No LearningSteps middleware, so FSRS never schedules reviews minutes apart
const scheduler = defineScheduler({ model: FSRS7Model, chrono: dateChrono })
  .use(
    schedulerDesiredRetentionMiddleware,
    schedulerStatsMiddleware,
    schedulerScheduledDaysMiddleware,
    schedulerMaximumIntervalMiddleware,
  )
  .create({
    config: {
      weights: FSRS7_DEFAULT_WEIGHTS,
      fractionalDays: false,
      desiredRetention: DESIRED_RETENTION,
      maximumInterval: MAX_INTERVAL_DAYS,
    },
  });

// Used on its own to calculate the chance of remembering
const model = FSRS7Model.create({ config: { weights: FSRS7_DEFAULT_WEIGHTS } });
const clock = dateChrono.create({ config: { fractionalDays: false } });

// Take the types from the scheduler itself, so they always match the installed version
type FsrsCard = ReturnType<typeof scheduler.newCard>;
type FsrsReviewLog = ReturnType<typeof scheduler.review>["revlog"];

const GRADES: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const RATINGS_BY_GRADE = Object.fromEntries(Object.entries(GRADES).map(([rating, grade]) => [grade, rating])) as Record<
  Grade,
  ReviewRating
>;

// How finishing a task translates into the topic's first FSRS rating
const FIRST_RATING: Record<Confidence, ReviewRating> = {
  shaky: "hard",
  okay: "good",
  solid: "easy",
};

// Everything we store about a topic's memory
export type MemoryState = {
  stability: number;
  stabilityFast: number;
  difficulty: number;
  fsrsState: number;
  scheduleStatus: string;
  reps: number;
  lapses: number;
  scheduledDays: number;
  lastReviewAt: Date | null;
  dueAt: Date;
};

// The memory state from just before a review, saved in the review log
export type ReviewLogEntry = {
  rating: ReviewRating;
  reviewedAt: Date;
  stateBefore: number;
  stabilityBefore: number;
  stabilityFastBefore: number;
  difficultyBefore: number;
  scheduledDaysBefore: number;
  dueAtBefore: Date;
  lastReviewAtBefore: Date | null;
};

// Midnight UTC, the given number of days from today
export function daysFromToday(days: number, now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

// Revisit works in whole days, from 1 up to the maximum
function toWholeDays(days: number) {
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));
}

function toCard(memory: MemoryState): FsrsCard {
  return {
    // Start from a default card, so any field we don't store keeps a valid value
    ...scheduler.newCard({ now: memory.dueAt }),
    stability: memory.stability,
    stabilityFast: memory.stabilityFast,
    difficulty: memory.difficulty,
    state: memory.fsrsState as State,
    scheduleStatus: memory.scheduleStatus as FsrsCard["scheduleStatus"],
    reps: memory.reps,
    lapses: memory.lapses,
    scheduledDays: memory.scheduledDays,
    lastReviewAt: memory.lastReviewAt,
    dueAt: memory.dueAt,
  };
}

function fromCard(card: FsrsCard, reviewedAt: Date): MemoryState {
  const days = toWholeDays(card.scheduledDays);

  return {
    stability: card.stability,
    stabilityFast: card.stabilityFast,
    difficulty: card.difficulty,
    fsrsState: card.state,
    scheduleStatus: card.scheduleStatus,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: days,
    lastReviewAt: card.lastReviewAt,
    // Ignore FSRS's exact time and make it due for the whole day
    dueAt: daysFromToday(days, reviewedAt),
  };
}

function toLogEntry(revlog: FsrsReviewLog, rating: ReviewRating): ReviewLogEntry {
  return {
    rating,
    reviewedAt: revlog.reviewTime,
    stateBefore: revlog.state,
    stabilityBefore: revlog.stability,
    stabilityFastBefore: revlog.stabilityFast,
    difficultyBefore: revlog.difficulty,
    scheduledDaysBefore: revlog.scheduledDays,
    dueAtBefore: revlog.dueAt,
    lastReviewAtBefore: revlog.lastReviewAt,
  };
}

export function scheduleFirstReview(confidence: Confidence, now = new Date(), overrideDays?: number) {
  const rating = FIRST_RATING[confidence];
  const { card, revlog } = scheduler.review({
    card: scheduler.newCard({ now }),
    grade: GRADES[rating],
    now,
  });

  const memory = fromCard(card, now);

  const days = overrideDays ?? Math.min(memory.scheduledDays, MAX_FIRST_INTERVAL_DAYS);
  memory.scheduledDays = toWholeDays(days);
  memory.dueAt = daysFromToday(memory.scheduledDays, now);

  return { memory, log: toLogEntry(revlog, rating) };
}

export function firstReviewOptions(now = new Date()) {
  return Object.fromEntries(
    CONFIDENCE_LEVELS.map((confidence) => [confidence, scheduleFirstReview(confidence, now).memory.scheduledDays]),
  ) as Record<Confidence, number>;
}

export function scheduleReview(memory: MemoryState, rating: ReviewRating, now = new Date()) {
  const { card, revlog } = scheduler.review({
    card: toCard(memory),
    grade: GRADES[rating],
    now,
  });

  return { memory: fromCard(card, now), log: toLogEntry(revlog, rating) };
}

// The interval each rating button would give, without saving anything
export function reviewOptions(memory: MemoryState, now = new Date()) {
  const options = {} as Record<ReviewRating, number>;

  for (const option of scheduler.preview({ card: toCard(memory), now })) {
    options[RATINGS_BY_GRADE[option.grade]] = toWholeDays(option.card.scheduledDays);
  }

  return options;
}

// Your chance of remembering the topic right now, from 0 to 1
export function recallProbability(memory: MemoryState, now = new Date()) {
  if (!memory.lastReviewAt) return 1;

  const elapsedDays = clock.difference(memory.lastReviewAt, now);
  return model.forgettingCurve(
    {
      stability: memory.stability,
      stabilityFast: memory.stabilityFast,
      difficulty: memory.difficulty,
    },
    elapsedDays,
  );
}
