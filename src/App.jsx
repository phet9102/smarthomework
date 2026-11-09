import { useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useNow } from './hooks/useNow.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './lib/constants.js';
import { buildPlan } from './lib/scheduler.js';
import { newId, reviveSettings, reviveTasks, sampleTasks, sanitizeTask } from './lib/storage.js';
import { formatDuration } from './lib/time.js';
import DoThisFirst from './components/DoThisFirst.jsx';
import EmptyState from './components/EmptyState.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import TaskForm from './components/TaskForm.jsx';
import TaskList from './components/TaskList.jsx';
import Toast from './components/Toast.jsx';
import TodayPlan from './components/TodayPlan.jsx';
import WeekPlan from './components/WeekPlan.jsx';
import { CalendarIcon, ListIcon, PlusIcon, SettingsIcon, TargetIcon } from './components/Icons.jsx';

const TABS = [
  { key: 'focus', label: 'Focus', Icon: TargetIcon },
  { key: 'tasks', label: 'Tasks', Icon: ListIcon },
  { key: 'week', label: 'Week', Icon: CalendarIcon },
];

export default function App() {
  const [tasks, setTasks] = useLocalStorage(STORAGE_KEYS.tasks, [], reviveTasks);
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS, reviveSettings);
  const [tab, setTab] = useState('focus');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const now = useNow(60_000);

  const plan = useMemo(() => buildPlan(tasks, settings, now), [tasks, settings, now]);
  const taskById = useMemo(() => new Map(plan.ranked.map((t) => [t.id, t])), [plan.ranked]);
  const subjects = useMemo(() => [...new Set(tasks.map((t) => t.subject))].sort(), [tasks]);

  const openTasks = plan.ranked;
  const doneThisWeek = tasks.filter(
    (t) => t.done && t.doneAt && now - new Date(t.doneAt) < 7 * 24 * 3600 * 1000,
  ).length;
  const totalRemaining = openTasks.reduce((s, t) => s + t.meta.remaining, 0);
  const weekProgress = doneThisWeek + openTasks.length === 0 ? 0 : Math.round((doneThisWeek / (doneThisWeek + openTasks.length)) * 100);

  // ---------- task actions ----------
  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = useCallback((task) => {
    setEditing(task);
    setFormOpen(true);
  }, []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  const saveTask = (data) => {
    if (data.id) {
      setTasks((prev) => prev.map((t) => (t.id === data.id ? sanitizeTask({ ...t, ...data, meta: undefined }) : t)));
      setToast({ message: 'Task updated' });
    } else {
      const task = sanitizeTask({ ...data, id: newId(), createdAt: new Date().toISOString() });
      setTasks((prev) => [...prev, task]);
      setToast({ message: `Added "${task.title}"` });
    }
    setFormOpen(false);
  };

  const toggleDone = useCallback(
    (id) => {
      const current = tasks.find((t) => t.id === id);
      if (!current) return;
      const nowDone = !current.done;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                done: nowDone,
                doneAt: nowDone ? new Date().toISOString() : null,
                progress: nowDone ? 100 : Math.min(t.progress, 75),
              }
            : t,
        ),
      );
      setToast(nowDone ? { message: 'Nice work! Task done ✅', undo: { type: 'undone', id } } : { message: 'Moved back to To do' });
    },
    [tasks, setTasks],
  );

  const setProgress = useCallback(
    (id, progress) => {
      if (progress >= 100) {
        toggleDone(id);
        return;
      }
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, progress } : t)));
    },
    [setTasks, toggleDone],
  );

  const deleteTask = useCallback(
    (id) => {
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return;
      const removed = tasks[index];
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setToast({ message: `Deleted "${removed.title}"`, undo: { type: 'restore', task: removed, index } });
    },
    [tasks, setTasks],
  );

  const undo = () => {
    const u = toast?.undo;
    if (!u) return;
    if (u.type === 'restore') {
      setTasks((prev) => {
        if (prev.some((t) => t.id === u.task.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(u.index, next.length), 0, u.task);
        return next;
      });
    } else if (u.type === 'undone') {
      setTasks((prev) => prev.map((t) => (t.id === u.id ? { ...t, done: false, doneAt: null, progress: 75 } : t)));
    }
    setToast(null);
  };
  const dismissToast = useCallback(() => setToast(null), []);

  const clearDone = () => {
    const removed = tasks.filter((t) => t.done).length;
    setTasks((prev) => prev.filter((t) => !t.done));
    setToast({ message: `Cleared ${removed} finished task${removed === 1 ? '' : 's'}` });
  };

  const handlers = { onToggleDone: toggleDone, onProgress: setProgress, onEdit: openEdit, onDelete: deleteTask };

  // ---------- render ----------
  return (
    <div className="min-h-dvh pb-28 sm:pb-12">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white" aria-hidden>
            <TargetIcon width={20} height={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight">Smart Homework</h1>
            <p className="truncate text-xs text-slate-500">
              {openTasks.length === 0
                ? 'All clear'
                : `${openTasks.length} to do · ${formatDuration(totalRemaining)} of work`}
            </p>
          </div>

          <nav className="hidden rounded-xl bg-slate-100 p-1 sm:flex" aria-label="Views">
            {TABS.map(({ key, label }) => (
              <button
                type="button"
                key={key}
                onClick={() => setTab(key)}
                aria-current={tab === key ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <button type="button" className="btn-primary hidden px-3 sm:inline-flex" onClick={openNew}>
            <PlusIcon width={18} height={18} /> Add
          </button>
          <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <SettingsIcon />
          </button>
        </div>

        {tasks.length > 0 && (
          <div className="mx-auto max-w-3xl px-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${weekProgress}%` }} />
              </div>
              <span className="text-xs font-medium text-slate-500">
                {doneThisWeek} done this week
              </span>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        {tasks.length === 0 ? (
          <EmptyState onAdd={openNew} onSample={() => setTasks(sampleTasks(new Date()))} />
        ) : (
          <>
            {tab === 'focus' && (
              <div className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-3">
                  {openTasks.length > 0 ? (
                    <DoThisFirst ranked={openTasks} now={now} onToggleDone={toggleDone} onProgress={setProgress} onOpen={openEdit} />
                  ) : (
                    <div className="card px-6 py-10 text-center">
                      <p className="text-4xl" aria-hidden>🎉</p>
                      <h2 className="mt-3 text-xl font-bold">All caught up!</h2>
                      <p className="mt-1 text-sm text-slate-500">Nothing left to do. Rest, play, recharge.</p>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <TodayPlan plan={plan} taskById={taskById} now={now} />
                </div>
              </div>
            )}

            {tab === 'tasks' && (
              <TaskList ranked={openTasks} tasks={tasks} now={now} handlers={handlers} onClearDone={clearDone} />
            )}

            {tab === 'week' && <WeekPlan plan={plan} taskById={taskById} now={now} />}
          </>
        )}
      </main>

      {/* Mobile bottom navigation with a centered add button */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pt-2 backdrop-blur sm:hidden"
        aria-label="Views"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 items-center px-2">
          <TabButton active={tab === 'focus'} label="Focus" Icon={TargetIcon} onClick={() => setTab('focus')} />
          <TabButton active={tab === 'tasks'} label="Tasks" Icon={ListIcon} onClick={() => setTab('tasks')} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openNew}
              aria-label="Add homework"
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <PlusIcon width={26} height={26} strokeWidth={2.5} />
            </button>
          </div>
          <TabButton active={tab === 'week'} label="Week" Icon={CalendarIcon} onClick={() => setTab('week')} />
        </div>
      </nav>

      <TaskForm open={formOpen} task={editing} subjects={subjects} onSave={saveTask} onClose={closeForm} />
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        tasks={tasks}
        onClose={() => setSettingsOpen(false)}
        onSave={(s) => {
          setSettings(s);
          setSettingsOpen(false);
          setToast({ message: 'Settings saved' });
        }}
        onImport={(importedTasks, importedSettings) => {
          setTasks(importedTasks);
          if (importedSettings) setSettings(importedSettings);
        }}
        onReset={() => {
          setTasks([]);
          setSettings(DEFAULT_SETTINGS);
        }}
      />
      <Toast toast={toast} onUndo={undo} onDismiss={dismissToast} />
    </div>
  );
}

function TabButton({ active, label, Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${
        active ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      <Icon width={22} height={22} />
      {label}
    </button>
  );
}
