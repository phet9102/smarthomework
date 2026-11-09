import { TASK_TYPES } from './constants.js';
import { MS_MIN, addDays, dayKey, parseClock, startOfDay } from './time.js';
import { rankTasks } from './priority.js';

/**
 * DAILY SCHEDULER
 * ---------------
 * Allocates each open task's remaining minutes to the days before its
 * deadline, without exceeding each day's free time (and the burnout cap).
 *
 *  - Tasks are placed in order of deadline (earliest first), ties broken by
 *    priority score: this is Earliest-Deadline-First, which finishes the
 *    most work on time when there is not enough time for everything.
 *  - "Spread" types (essay, project, exam prep) are split evenly across the
 *    available days, capped per day, so exam study becomes spaced practice
 *    instead of a single all-nighter.
 *  - Anything that cannot fit before the deadline is reported as
 *    `unscheduled` minutes so the UI can warn the student.
 *  - Today's allocations are then turned into concrete time blocks with
 *    breaks, starting at the later of "now" and the usual study start time.
 */

const MIN_CHUNK = 15; // never schedule less than 15 minutes of a task in a day

function capacityFor(date, settings, now) {
  const base = Math.min(settings.dailyMinutes[date.getDay()] ?? 0, settings.maxDailyMinutes);
  if (dayKey(date) !== dayKey(now)) return base;

  // Today: only the part of the study window that has not passed yet.
  const start = parseClock(settings.studyStart);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin <= start) return base;
  const windowEnd = Math.min(start + base * 2, 23 * 60); // a generous evening window
  const leftInWindow = Math.max(0, windowEnd - nowMin);
  // Round down to 5-minute steps so blocks start/end on tidy times.
  return Math.max(0, Math.floor(Math.min(base, leftInWindow) / 5) * 5);
}

/** Days (as Date at midnight) on which work for `task` may be scheduled. */
function eligibleDays(days, task, now) {
  const due = new Date(task.due);
  return days.filter((d) => {
    if (d.date.getTime() >= due.getTime()) return false; // starts after deadline
    if (dayKey(d.date) === dayKey(due)) {
      // Same day as the deadline: only usable if it is due later in the day.
      return due.getHours() * 60 + due.getMinutes() >= 18 * 60 || dayKey(due) === dayKey(now);
    }
    return true;
  });
}

export function buildPlan(tasks, settings, now = new Date()) {
  const ranked = rankTasks(tasks, settings, now);
  const horizon = Math.max(1, settings.planDays);
  const today = startOfDay(now);

  const days = Array.from({ length: horizon }, (_, i) => {
    const date = addDays(today, i);
    const capacity = capacityFor(date, settings, now);
    return { key: dayKey(date), date, capacity, used: 0, items: [] };
  });

  const order = [...ranked].sort(
    (a, b) => new Date(a.due) - new Date(b.due) || b.meta.score - a.meta.score,
  );

  const unscheduled = [];

  for (const task of order) {
    let left = task.meta.remaining;
    if (left <= 0) continue;

    const type = TASK_TYPES[task.type] ?? TASK_TYPES.quick;
    // Overdue work goes into today, as early as possible.
    const pool = task.meta.overdue ? days.slice(0, 1) : eligibleDays(days, task, now);
    const dueBeyondHorizon = new Date(task.due) > addDays(today, horizon);

    if (type.spread && pool.length > 1) {
      // Even share per day, but at least a meaningful chunk and at most the type cap.
      const evenShare = Math.ceil(left / pool.length / 5) * 5;
      const perDay = Math.min(type.dailyCap ?? Infinity, Math.max(MIN_CHUNK * 2, evenShare));
      for (const day of pool) {
        if (left <= 0) break;
        const free = day.capacity - day.used;
        const amount = Math.min(perDay, left, free);
        if (amount >= Math.min(MIN_CHUNK, left)) {
          day.items.push({ taskId: task.id, minutes: amount });
          day.used += amount;
          left -= amount;
        }
      }
      // Second pass: if the even split left something over, fill any space
      // remaining, still respecting the per-type daily cap.
      for (const day of pool) {
        if (left <= 0) break;
        const already = day.items.find((it) => it.taskId === task.id)?.minutes ?? 0;
        const roomForType = (type.dailyCap ?? Infinity) - already;
        const amount = Math.min(left, day.capacity - day.used, roomForType);
        if (amount >= Math.min(MIN_CHUNK, left)) {
          const existing = day.items.find((it) => it.taskId === task.id);
          if (existing) existing.minutes += amount;
          else day.items.push({ taskId: task.id, minutes: amount });
          day.used += amount;
          left -= amount;
        }
      }
    } else {
      // Greedy: do it as early as possible (finished work = less stress).
      for (const day of pool) {
        if (left <= 0) break;
        const amount = Math.min(left, day.capacity - day.used);
        if (amount >= Math.min(MIN_CHUNK, left)) {
          day.items.push({ taskId: task.id, minutes: amount });
          day.used += amount;
          left -= amount;
        }
      }
    }

    // Remaining work on a task due after the planning window is fine:
    // it will be scheduled as the window rolls forward.
    if (left > 0 && !dueBeyondHorizon) {
      unscheduled.push({ taskId: task.id, minutes: left });
    }
  }

  // Within each day, do the most important item first.
  const scoreById = new Map(ranked.map((t) => [t.id, t.meta.score]));
  for (const day of days) {
    day.items.sort((a, b) => (scoreById.get(b.taskId) ?? 0) - (scoreById.get(a.taskId) ?? 0));
  }

  return {
    ranked,
    days,
    unscheduled,
    todayBlocks: buildTimeBlocks(days[0], settings, now),
  };
}

/** Turns today's allocations into clock-time focus blocks separated by breaks. */
export function buildTimeBlocks(day, settings, now = new Date()) {
  if (!day || day.items.length === 0) return [];
  const block = Math.max(15, settings.blockMinutes);
  const brk = Math.max(0, settings.breakMinutes);

  const start = new Date(day.date);
  start.setMinutes(parseClock(settings.studyStart));
  let cursor = new Date(Math.max(start.getTime(), now.getTime()));
  // Round up to the next 5 minutes for a tidy schedule.
  const rem = cursor.getMinutes() % 5;
  if (rem !== 0 || cursor.getSeconds() > 0) {
    cursor = new Date(cursor.getTime() + ((5 - rem) % 5 || 5) * MS_MIN);
    cursor.setSeconds(0, 0);
  }

  const blocks = [];
  day.items.forEach((item) => {
    let left = item.minutes;
    while (left > 0) {
      const len = left - block < 10 ? left : Math.min(block, left); // avoid tiny tail blocks
      const end = new Date(cursor.getTime() + len * MS_MIN);
      blocks.push({ kind: 'focus', taskId: item.taskId, start: cursor, end, minutes: len });
      cursor = end;
      left -= len;
      if (brk > 0) {
        const bEnd = new Date(cursor.getTime() + brk * MS_MIN);
        blocks.push({ kind: 'break', start: cursor, end: bEnd, minutes: brk });
        cursor = bEnd;
      }
    }
  });
  if (blocks.length && blocks[blocks.length - 1].kind === 'break') blocks.pop();
  return blocks;
}

/** Overall workload status for the burnout meter. */
export function workloadStatus(day) {
  if (!day || day.capacity === 0) return { ratio: 0, label: 'Rest day', tone: 'slate' };
  const ratio = day.used / day.capacity;
  if (ratio >= 0.95) return { ratio, label: 'Full day: protect your sleep', tone: 'rose' };
  if (ratio >= 0.7) return { ratio, label: 'Busy but doable', tone: 'amber' };
  if (ratio > 0) return { ratio, label: 'Balanced', tone: 'emerald' };
  return { ratio, label: 'Free time!', tone: 'emerald' };
}
