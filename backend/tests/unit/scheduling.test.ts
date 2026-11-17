import { describe, expect, it } from "vitest";
import {
  daysFromToday,
  firstReviewOptions,
  MAX_INTERVAL_DAYS,
  recallProbability,
  REVIEW_RATINGS,
  reviewOptions,
  scheduleFirstReview,
  scheduleReview,
  MAX_FIRST_INTERVAL_DAYS,
} from "../../src/lib/scheduling.ts";

// A fixed time makes every result the same on every run
const NOW = new Date("2026-11-17T10:00:00.000Z");

const isMidnightUtc = (date: Date) => date.toISOString().endsWith("T00:00:00.000Z");

describe("daysFromToday", () => {
  it("returns midnight UTC the given number of days later", () => {
    expect(daysFromToday(3, NOW).toISOString()).toBe("2026-11-20T00:00:00.000Z");
  });

  it("moves into the next month correctly", () => {
    const lateEvening = new Date("2026-11-30T23:30:00.000Z");
    expect(daysFromToday(1, lateEvening).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("scheduleFirstReview", () => {
  it("treats the topic as reviewed once and makes it due for a whole day", () => {
    const { memory, log } = scheduleFirstReview("okay", NOW);

    expect(memory.reps).toBe(1);
    expect(memory.lastReviewAt).toEqual(NOW);
    expect(memory.scheduledDays).toBeGreaterThanOrEqual(1);
    expect(memory.dueAt).toEqual(daysFromToday(memory.scheduledDays, NOW));
    expect(isMidnightUtc(memory.dueAt)).toBe(true);

    expect(log).toMatchObject({ rating: "good", reviewedAt: NOW, stateBefore: 0 });
  });

  it("schedules more confident topics further away", () => {
    const shaky = scheduleFirstReview("shaky", NOW).memory.scheduledDays;
    const okay = scheduleFirstReview("okay", NOW).memory.scheduledDays;
    const solid = scheduleFirstReview("solid", NOW).memory.scheduledDays;

    expect(shaky).toBeLessThanOrEqual(okay);
    expect(okay).toBeLessThanOrEqual(solid);
    expect(shaky).toBeLessThan(solid);
  });

  it("uses a chosen date without changing the memory state", () => {
    const suggested = scheduleFirstReview("okay", NOW).memory;
    const chosen = scheduleFirstReview("okay", NOW, 5).memory;

    expect(chosen.scheduledDays).toBe(5);
    expect(chosen.dueAt).toEqual(daysFromToday(5, NOW));
    expect(chosen.stability).toBe(suggested.stability);
    expect(chosen.difficulty).toBe(suggested.difficulty);
  });

  it("keeps a chosen date between 1 day and the maximum", () => {
    expect(scheduleFirstReview("okay", NOW, 0).memory.scheduledDays).toBe(1);
    expect(scheduleFirstReview("okay", NOW, 1000).memory.scheduledDays).toBe(MAX_INTERVAL_DAYS);
  });

  it("suggests a first review within a week, however confident the user is", () => {
    for (const confidence of ["shaky", "okay", "solid"] as const) {
      expect(scheduleFirstReview(confidence, NOW).memory.scheduledDays).toBeLessThanOrEqual(MAX_FIRST_INTERVAL_DAYS);
    }
  });

  it("lets a chosen date go beyond the first-review limit", () => {
    expect(scheduleFirstReview("solid", NOW, 10).memory.scheduledDays).toBe(10);
  });
});

describe("firstReviewOptions", () => {
  it("matches what finishing a task would schedule for each confidence", () => {
    const options = firstReviewOptions(NOW);

    for (const confidence of ["shaky", "okay", "solid"] as const) {
      expect(options[confidence]).toBe(scheduleFirstReview(confidence, NOW).memory.scheduledDays);
    }
  });
});

describe("scheduleReview", () => {
  const learned = scheduleFirstReview("okay", NOW).memory;
  const reviewDay = learned.dueAt;

  it("records a successful review", () => {
    const { memory, log } = scheduleReview(learned, "good", reviewDay);

    expect(memory.reps).toBe(2);
    expect(memory.lapses).toBe(0);
    expect(memory.lastReviewAt).toEqual(reviewDay);
    expect(memory.dueAt.getTime()).toBeGreaterThan(reviewDay.getTime());
    expect(isMidnightUtc(memory.dueAt)).toBe(true);

    // The log keeps the state from before the review
    expect(log.rating).toBe("good");
    expect(log.stabilityBefore).toBe(learned.stability);
    expect(log.scheduledDaysBefore).toBe(learned.scheduledDays);
  });

  it("counts a forgotten topic as a lapse and brings it back tomorrow", () => {
    const { memory } = scheduleReview(learned, "again", reviewDay);

    expect(memory.lapses).toBe(1);
    expect(memory.scheduledDays).toBe(1);
    expect(memory.dueAt).toEqual(daysFromToday(1, reviewDay));
  });

  it("does not change the memory state it was given", () => {
    const before = structuredClone(learned);

    scheduleReview(learned, "easy", reviewDay);

    expect(learned).toEqual(before);
  });
});

describe("reviewOptions", () => {
  const learned = scheduleFirstReview("okay", NOW).memory;
  const reviewDay = learned.dueAt;

  it("gives longer intervals for better ratings", () => {
    const options = reviewOptions(learned, reviewDay);

    expect(Object.keys(options).sort()).toEqual([...REVIEW_RATINGS].sort());
    expect(options.again).toBeGreaterThanOrEqual(1);
    expect(options.again).toBeLessThanOrEqual(options.hard);
    expect(options.hard).toBeLessThanOrEqual(options.good);
    expect(options.good).toBeLessThanOrEqual(options.easy);
    expect(options.easy).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it("matches what each rating would actually schedule", () => {
    const options = reviewOptions(learned, reviewDay);

    for (const rating of REVIEW_RATINGS) {
      expect(options[rating]).toBe(scheduleReview(learned, rating, reviewDay).memory.scheduledDays);
    }
  });
});

describe("recallProbability", () => {
  const learned = scheduleFirstReview("okay", NOW).memory;
  const daysAfter = (days: number) => daysFromToday(days, NOW);

  it("is almost certain right after studying", () => {
    expect(recallProbability(learned, NOW)).toBeGreaterThan(0.99);
  });

  it("drops as time passes", () => {
    const afterOneDay = recallProbability(learned, daysAfter(1));
    const afterOneWeek = recallProbability(learned, daysAfter(7));
    const afterOneMonth = recallProbability(learned, daysAfter(30));

    expect(afterOneDay).toBeGreaterThan(afterOneWeek);
    expect(afterOneWeek).toBeGreaterThan(afterOneMonth);
  });

  it("stays the same throughout one UTC day", () => {
    const morning = new Date("2026-11-20T01:00:00.000Z");
    const evening = new Date("2026-11-20T23:00:00.000Z");

    expect(recallProbability(learned, morning)).toBe(recallProbability(learned, evening));
  });

  it("is certain for a topic that has never been reviewed", () => {
    expect(recallProbability({ ...learned, lastReviewAt: null }, NOW)).toBe(1);
  });
});
