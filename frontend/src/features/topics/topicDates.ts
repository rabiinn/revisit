export const DAY_MS = 24 * 60 * 60 * 1000;

// Whole UTC days from today to the due date: 0 is today, -2 is two days ago
export function daysUntil(dueAt: string, now = new Date()) {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(dueAt).getTime() - todayUtc) / DAY_MS);
}

export function dueLabel(days: number) {
  if (days < -1) return `${-days} days overdue`;
  if (days === -1) return "1 day overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
