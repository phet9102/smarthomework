// Task types with sensible default time estimates (minutes).
// `spread: true` means the scheduler splits the work across several days
// (spaced practice for exams, steady progress for projects) instead of
// cramming it into a single evening.
export const TASK_TYPES = {
  quick: {
    emoji: '✏️',
    defaultMinutes: 30,
    spread: false,
    dailyCap: null,
  },
  reading: {
    emoji: '📖',
    defaultMinutes: 45,
    spread: false,
    dailyCap: null,
  },
  essay: {
    emoji: '📝',
    defaultMinutes: 120,
    spread: true,
    dailyCap: 90,
  },
  project: {
    emoji: '👥',
    defaultMinutes: 180,
    spread: true,
    dailyCap: 90,
  },
  exam: {
    emoji: '🎯',
    defaultMinutes: 240,
    spread: true,
    dailyCap: 60,
  },
};

export const TYPE_KEYS = Object.keys(TASK_TYPES);

// Labels/hints live in the translation files (importance.1 … importance.5).
export const IMPORTANCE_LEVELS = [1, 2, 3, 4, 5];

export const PRIORITY_LEVELS = {
  overdue: {
    chip: 'bg-rose-600 text-white',
    bar: 'bg-rose-600',
    ring: 'ring-rose-200',
  },
  critical: {
    chip: 'bg-rose-100 text-rose-700',
    bar: 'bg-rose-500',
    ring: 'ring-rose-100',
  },
  high: {
    chip: 'bg-amber-100 text-amber-800',
    bar: 'bg-amber-500',
    ring: 'ring-amber-100',
  },
  medium: {
    chip: 'bg-sky-100 text-sky-700',
    bar: 'bg-sky-500',
    ring: 'ring-sky-100',
  },
  low: {
    chip: 'bg-slate-100 text-slate-600',
    bar: 'bg-slate-400',
    ring: 'ring-slate-100',
  },
};

export const DEFAULT_SETTINGS = {
  // Free study minutes available on each weekday (Sun..Sat).
  dailyMinutes: [180, 120, 120, 120, 120, 90, 180],
  // Hard ceiling per day, regardless of free time: the burnout guard.
  maxDailyMinutes: 240,
  // Focus block length and break length (Pomodoro-style).
  blockMinutes: 45,
  breakMinutes: 10,
  // When study time normally starts on a given day ("HH:MM").
  studyStart: '16:30',
  // How many days ahead the planner looks.
  planDays: 7,
};

// Free plan: max number of open (not done) tasks. Trial/Pro: unlimited.
export const FREE_TASK_LIMIT = 5;

export const STORAGE_KEYS = {
  tasks: 'shp.tasks.v1',
  settings: 'shp.settings.v1',
};
