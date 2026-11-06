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

export function initialSchedule(confidence: Confidence, overrideDays?: number) {
  const { days, strength } = INITIAL_SCHEDULE[confidence];
  const intervalDays = overrideDays ?? days;

  return { strength, intervalDays, dueAt: daysFromToday(intervalDays) };
}
