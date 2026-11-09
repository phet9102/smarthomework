import { TASK_TYPES } from './constants.js';
import { MS_HOUR, MS_DAY, startOfDay, addDays } from './time.js';

/**
 * SMART PRIORITIZATION ENGINE
 * ---------------------------
 * Every open task gets a 0–100 score built from three signals:
 *
 *  1. Urgency (U, weight 0.45): how close the deadline is.
 *       U = 100 · e^(−hoursLeft / 48)
 *     → due now ≈ 100, due in 1 day ≈ 61, 2 days ≈ 37, 4 days ≈ 14, a week ≈ 3.
 *
 *  2. Importance (I, weight 0.30): the 1–5 weight the student picks.
 *       I = (importance − 1) / 4 · 100
 *
 *  3. Pressure (P, weight 0.25): how much of the free time left before the
 *     deadline this task still needs. This is what makes a big essay due
 *     in 4 days outrank a 10-minute worksheet due tomorrow.
 *       load = remainingMinutes / freeMinutesUntilDue
 *       P    = min(load, 1) · 100
 *
 *  score = 0.45·U + 0.30·I + 0.25·P
 *
 *  Overdue tasks are pinned to the top (score = 100 + importance).
 *  A task whose load > 1 cannot be finished in the free time left
 *  and is flagged `atRisk` so the UI can warn early.
 */

export const WEIGHTS = { urgency: 0.45, importance: 0.3, pressure: 0.25 };

export function estimatedMinutes(task) {
  const preset = TASK_TYPES[task.type]?.defaultMinutes ?? 60;
  const est = Number(task.estimate);
  return Number.isFinite(est) && est > 0 ? est : preset;
}

export function remainingMinutes(task) {
  const progress = Math.min(100, Math.max(0, Number(task.progress) || 0));
  return Math.round(estimatedMinutes(task) * (1 - progress / 100));
}

/** Free study minutes available from `now` until `due`, using per-weekday settings. */
export function freeMinutesUntil(due, settings, now = new Date()) {
  const dueTime = new Date(due).getTime();
  if (dueTime <= now.getTime()) return 0;

  const cap = settings.maxDailyMinutes;
  let total = 0;
  let cursor = startOfDay(now);
  // Guard against very distant deadlines: 120 days is plenty for scoring.
  for (let i = 0; i < 120 && cursor.getTime() < dueTime; i += 1) {
    const dayMinutes = Math.min(settings.dailyMinutes[cursor.getDay()] ?? 0, cap);
    const dayStart = cursor.getTime();
    const dayEnd = dayStart + MS_DAY;
    // Fraction of this day that is both after now and before the deadline.
    const from = Math.max(dayStart, now.getTime());
    const to = Math.min(dayEnd, dueTime);
    const fraction = Math.max(0, to - from) / MS_DAY;
    // Today and the due day only count partially.
    total += dayMinutes * (i === 0 || to < dayEnd ? fraction : 1);
    cursor = addDays(cursor, 1);
  }
  return Math.round(total);
}

export function levelForScore(score, overdue) {
  if (overdue) return 'overdue';
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export function scoreTask(task, settings, now = new Date()) {
  const remaining = remainingMinutes(task);
  const hoursLeft = (new Date(task.due).getTime() - now.getTime()) / MS_HOUR;
  const overdue = hoursLeft < 0;
  const importance = Math.min(5, Math.max(1, Number(task.importance) || 3));

  const urgency = overdue ? 100 : 100 * Math.exp(-hoursLeft / 48);
  const importanceScore = ((importance - 1) / 4) * 100;
  const freeLeft = freeMinutesUntil(task.due, settings, now);
  const load = remaining === 0 ? 0 : freeLeft <= 0 ? Infinity : remaining / freeLeft;
  const pressure = Math.min(load, 1) * 100;

  const raw =
    WEIGHTS.urgency * urgency + WEIGHTS.importance * importanceScore + WEIGHTS.pressure * pressure;
  const score = overdue ? 100 + importance : Math.round(raw);

  return {
    score,
    level: levelForScore(score, overdue),
    overdue,
    atRisk: !overdue && load > 1,
    hoursLeft,
    remaining,
    load,
    parts: {
      urgency: Math.round(urgency),
      importance: Math.round(importanceScore),
      pressure: Math.round(pressure),
    },
  };
}

/** Returns open tasks enriched with `meta` and sorted most-important first. */
export function rankTasks(tasks, settings, now = new Date()) {
  return tasks
    .filter((t) => !t.done)
    .map((t) => ({ ...t, meta: scoreTask(t, settings, now) }))
    .sort(
      (a, b) =>
        b.meta.score - a.meta.score ||
        new Date(a.due) - new Date(b.due) ||
        b.importance - a.importance,
    );
}

/** Translation key (reason.*) for one short, human reason why a task ranks where it does. */
export function priorityReason(meta) {
  if (meta.overdue) return 'reason.overdue';
  if (meta.atRisk) return 'reason.atRisk';
  const { urgency, importance, pressure } = meta.parts;
  const top = Math.max(urgency, importance, pressure);
  if (top === urgency && urgency >= 50) return 'reason.urgency';
  if (top === pressure && pressure >= 40) return 'reason.pressure';
  if (top === importance && importance >= 75) return 'reason.importance';
  if (meta.hoursLeft > 24 * 5) return 'reason.early';
  return 'reason.steady';
}
