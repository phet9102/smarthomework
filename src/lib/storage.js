import { DEFAULT_SETTINGS, TASK_TYPES } from './constants.js';
import { addDays, startOfDay } from './time.js';

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clampInt(v, min, max, fallback) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Validates one stored task; returns null if it is unusable. */
export function sanitizeTask(t) {
  if (!t || typeof t !== 'object') return null;
  const due = new Date(t.due);
  if (Number.isNaN(due.getTime())) return null;
  const type = TASK_TYPES[t.type] ? t.type : 'quick';
  return {
    id: String(t.id || newId()),
    subject: String(t.subject || 'General').slice(0, 40),
    title: String(t.title || 'Untitled task').slice(0, 120),
    type,
    due: due.toISOString(),
    importance: clampInt(t.importance, 1, 5, 3),
    estimate: clampInt(t.estimate, 5, 6000, TASK_TYPES[type].defaultMinutes),
    progress: clampInt(t.progress, 0, 100, 0),
    notes: String(t.notes || '').slice(0, 500),
    done: Boolean(t.done),
    doneAt: t.doneAt || null,
    createdAt: t.createdAt || new Date().toISOString(),
  };
}

export function reviveTasks(data) {
  if (!Array.isArray(data)) return [];
  return data.map(sanitizeTask).filter(Boolean);
}

export function reviveSettings(data) {
  const s = { ...DEFAULT_SETTINGS, ...(data && typeof data === 'object' ? data : {}) };
  const days = Array.isArray(s.dailyMinutes) && s.dailyMinutes.length === 7
    ? s.dailyMinutes
    : DEFAULT_SETTINGS.dailyMinutes;
  return {
    dailyMinutes: days.map((m, i) => clampInt(m, 0, 720, DEFAULT_SETTINGS.dailyMinutes[i])),
    maxDailyMinutes: clampInt(s.maxDailyMinutes, 30, 720, DEFAULT_SETTINGS.maxDailyMinutes),
    blockMinutes: clampInt(s.blockMinutes, 15, 120, DEFAULT_SETTINGS.blockMinutes),
    breakMinutes: clampInt(s.breakMinutes, 0, 30, DEFAULT_SETTINGS.breakMinutes),
    studyStart: /^\d{2}:\d{2}$/.test(s.studyStart) ? s.studyStart : DEFAULT_SETTINGS.studyStart,
    planDays: clampInt(s.planDays, 3, 14, DEFAULT_SETTINGS.planDays),
  };
}

/** A realistic example week so new users can see how the app works. */
export function sampleTasks(now = new Date()) {
  const at = (days, h, m = 0) => {
    const d = addDays(startOfDay(now), days);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  return [
    { subject: 'Math', title: 'Exercise 4.3 (Q1–20)', type: 'quick', due: at(1, 8, 30), importance: 3, estimate: 40 },
    { subject: 'English', title: 'Persuasive essay draft', type: 'essay', due: at(4, 23, 59), importance: 4, estimate: 150 },
    { subject: 'Physics', title: 'Midterm: Forces & Motion', type: 'exam', due: at(6, 9, 0), importance: 5, estimate: 300, progress: 10 },
    { subject: 'Biology', title: 'Cell model group project', type: 'project', due: at(9, 8, 30), importance: 4, estimate: 240 },
    { subject: 'History', title: 'Read chapter 7 + notes', type: 'reading', due: at(2, 8, 30), importance: 2, estimate: 45 },
  ].map((t) => sanitizeTask({ ...t, id: newId(), createdAt: new Date(now).toISOString() }));
}
