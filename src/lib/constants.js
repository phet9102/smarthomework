// Task types with sensible default time estimates (minutes).
// `spread: true` means the scheduler splits the work across several days
// (spaced practice for exams, steady progress for projects) instead of
// cramming it into a single evening.
export const TASK_TYPES = {
  quick: {
    label: 'Quick Exercise',
    emoji: '✏️',
    defaultMinutes: 30,
    spread: false,
    dailyCap: null,
  },
  reading: {
    label: 'Reading / Notes',
    emoji: '📖',
    defaultMinutes: 45,
    spread: false,
    dailyCap: null,
  },
  essay: {
    label: 'Essay / Report',
    emoji: '📝',
    defaultMinutes: 120,
    spread: true,
    dailyCap: 90,
  },
  project: {
    label: 'Group Project',
    emoji: '👥',
    defaultMinutes: 180,
    spread: true,
    dailyCap: 90,
  },
  exam: {
    label: 'Exam Prep',
    emoji: '🎯',
    defaultMinutes: 240,
    spread: true,
    dailyCap: 60,
  },
};

export const TYPE_KEYS = Object.keys(TASK_TYPES);

export const IMPORTANCE_LEVELS = [
  { value: 1, label: 'Minor', hint: 'Ungraded / practice' },
  { value: 2, label: 'Low', hint: 'Small part of the grade' },
  { value: 3, label: 'Normal', hint: 'Regular graded work' },
  { value: 4, label: 'High', hint: 'Big assignment or quiz' },
  { value: 5, label: 'Critical', hint: 'Major exam or final project' },
];

export const PRIORITY_LEVELS = {
  overdue: {
    label: 'Overdue',
    chip: 'bg-rose-600 text-white',
    bar: 'bg-rose-600',
    ring: 'ring-rose-200',
  },
  critical: {
    label: 'Do now',
    chip: 'bg-rose-100 text-rose-700',
    bar: 'bg-rose-500',
    ring: 'ring-rose-100',
  },
  high: {
    label: 'High',
    chip: 'bg-amber-100 text-amber-800',
    bar: 'bg-amber-500',
    ring: 'ring-amber-100',
  },
  medium: {
    label: 'Medium',
    chip: 'bg-sky-100 text-sky-700',
    bar: 'bg-sky-500',
    ring: 'ring-sky-100',
  },
  low: {
    label: 'Low',
    chip: 'bg-slate-100 text-slate-600',
    bar: 'bg-slate-400',
    ring: 'ring-slate-100',
  },
};

// Weekday index follows Date#getDay(): 0 = Sunday.
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export const STORAGE_KEYS = {
  tasks: 'shp.tasks.v1',
  settings: 'shp.settings.v1',
};
