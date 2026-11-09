# Smart Homework & Study Prioritizer

A mobile-first web app for high school students: add homework, see **what to do first**, how long it will take, and a daily study plan that respects your free time, so you avoid last-minute cramming and burnout.

Built with **React + Vite + Tailwind CSS**. All data stays in the browser (LocalStorage), so there is no backend or database to set up.

## Features

- **Quick entry:** subject, title, type (Quick Exercise, Reading, Essay, Group Project, Exam Prep), due date with one-tap shortcuts, importance (1–5), time estimate with type-based presets.
- **Do This First:** a single hero card with the highest-priority task and the reason it ranks first, plus the next two in line.
- **Smart priority score (0–100):** deadline urgency, importance, and how much of your remaining free time the task needs.
- **Daily plan:** today's work turned into focus blocks with breaks (Pomodoro-style), starting at your usual study time.
- **Week view:** big tasks and exam prep are split into smaller daily sessions (spaced practice).
- **Burnout guard:** a per-day maximum the planner never exceeds, a workload meter, and early "not enough time" warnings.
- **Progress tracking:** 25/50/75% quick buttons, done/undo, weekly completion bar.
- **Your data:** saved automatically, synced between tabs, export/import JSON backup.

## How the priority score works

```
Urgency    U = 100 · e^(−hoursLeft / 48)                 (due now ≈ 100, 1 day ≈ 61, 4 days ≈ 14)
Importance I = (importance − 1) / 4 · 100
Pressure   P = min(remainingMinutes / freeMinutesUntilDue, 1) · 100

score = 0.45·U + 0.30·I + 0.25·P
```

Overdue tasks are pinned to the top. A task that needs more time than you have free before its deadline is flagged **Tight**.

The scheduler fills days in Earliest-Deadline-First order. Essays, projects and exam prep are spread evenly across the available days (max 60–90 min/day for each), quick tasks are done as early as possible, and no day exceeds its free time or the burnout limit. See `src/lib/priority.js` and `src/lib/scheduler.js`.

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
```

Requires Node.js 18+ (20 recommended, see `.nvmrc`).

## Project structure

```
src/
  main.jsx, App.jsx, index.css
  lib/        constants, time helpers, priority engine, scheduler, storage/validation
  hooks/      useLocalStorage, useNow
  components/ DoThisFirst, TodayPlan, WeekPlan, TaskList, TaskCard, TaskForm, SettingsPanel, Sheet, Toast, EmptyState, Icons
```

## Deploy

Cloudflare Pages via GitHub (dashboard only):
Framework preset **React (Vite)** · Build command `npm run build` · Output directory `dist`.
