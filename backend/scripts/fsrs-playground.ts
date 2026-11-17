import { dateChrono, defineScheduler, Rating } from "ts-fsrs";
import {
  schedulerDesiredRetentionMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
} from "ts-fsrs/middlewares";
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from "ts-fsrs/models/fsrs-7";

// Model + time handling + the rules we want. No LearningSteps, so no minute-based steps
const definition = defineScheduler({ model: FSRS7Model, chrono: dateChrono }).use(
  schedulerDesiredRetentionMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerMaximumIntervalMiddleware,
);

const scheduler = definition.create({
  config: {
    weights: FSRS7_DEFAULT_WEIGHTS,
    fractionalDays: false,
    desiredRetention: 0.9,
    maximumInterval: 365,
  },
});

const print = (label: string, value: unknown) => console.log(`\n=== ${label} ===\n${JSON.stringify(value, null, 2)}`);

const now = new Date("2026-11-17T10:00:00.000Z");

const card = scheduler.newCard({ now });
print("1. New card", card);

const reviewed = scheduler.review({ card, grade: Rating.Good, now });
print("2a. Card after Good", reviewed.card);
print("2b. Review log", reviewed.revlog);

const threeDaysLater = new Date("2026-11-20T10:00:00.000Z");
const preview = [...scheduler.preview({ card: reviewed.card, now: threeDaysLater })].map((option) => ({
  grade: option.grade,
  dueAt: option.card.dueAt,
  scheduledDays: option.card.scheduledDays,
  stability: option.card.stability,
}));
print("3. Preview of all four ratings, 3 days later", preview);

// The model on its own calculates the chance of remembering
const model = FSRS7Model.create({ config: { weights: FSRS7_DEFAULT_WEIGHTS } });
const memoryState = {
  stability: reviewed.card.stability,
  stabilityFast: reviewed.card.stabilityFast,
  difficulty: reviewed.card.difficulty,
};
print(
  "4. Chance of remembering after N days",
  [0, 1, 3, 7, 14].map((days) => ({
    days,
    recall: model.forgettingCurve(memoryState, days),
  })),
);
