import { useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useNow } from './hooks/useNow.js';
import { DEFAULT_SETTINGS, FREE_TASK_LIMIT, STORAGE_KEYS } from './lib/constants.js';
import { buildPlan } from './lib/scheduler.js';
import { newId, reviveSettings, reviveTasks, sampleTasks, sanitizeTask } from './lib/storage.js';
import { useI18n } from './i18n/index.jsx';
import { useAccount } from './account/AccountProvider.jsx';
import { navigate } from './lib/router.jsx';
import AccountSheet from './components/AccountSheet.jsx';
import AdminSheet from './components/AdminSheet.jsx';
import DoThisFirst from './components/DoThisFirst.jsx';
import EmptyState from './components/EmptyState.jsx';
import PlanBanner, { ProLock } from './components/PlanBanner.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import TaskForm from './components/TaskForm.jsx';
import TaskList from './components/TaskList.jsx';
import Toast from './components/Toast.jsx';
import TodayPlan from './components/TodayPlan.jsx';
import WeekPlan from './components/WeekPlan.jsx';
import { CalendarIcon, ListIcon, PlusIcon, SettingsIcon, TargetIcon } from './components/Icons.jsx';

const TABS = [
  { key: 'focus', Icon: TargetIcon },
  { key: 'tasks', Icon: ListIcon },
  { key: 'week', Icon: CalendarIcon },
];

export default function App() {
  const { t, fmt } = useI18n();
  const account = useAccount();
  const [tasks, setTasks] = useLocalStorage(STORAGE_KEYS.tasks, [], reviveTasks);
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS, reviveSettings);
  const [tab, setTab] = useState('focus');
  // Which sheet (modal) is open: form | settings | account | checkout | admin
  const [sheet, setSheet] = useState(null);
  const [editing, setEditing] = useState(null);
  const [accountMode, setAccountMode] = useState('register');
  const [toast, setToast] = useState(null);
  const now = useNow(60_000);

  const plan = useMemo(() => buildPlan(tasks, settings, now), [tasks, settings, now]);
  const taskById = useMemo(() => new Map(plan.ranked.map((x) => [x.id, x])), [plan.ranked]);
  const subjects = useMemo(() => [...new Set(tasks.map((x) => x.subject))].sort(), [tasks]);

  const openTasks = plan.ranked;
  const doneThisWeek = tasks.filter((x) => x.done && x.doneAt && now - new Date(x.doneAt) < 7 * 24 * 3600 * 1000).length;
  const totalRemaining = openTasks.reduce((s, x) => s + x.meta.remaining, 0);
  const weekProgress =
    doneThisWeek + openTasks.length === 0 ? 0 : Math.round((doneThisWeek / (doneThisWeek + openTasks.length)) * 100);

  const closeSheet = useCallback(() => setSheet(null), []);
  const showToast = useCallback((message, long = false) => setToast({ message, long }), []);
  const openAccount = useCallback((mode = 'register') => {
    setAccountMode(mode);
    setSheet('account');
  }, []);

  // ---------- task actions ----------
  const openNew = () => {
    if (!account.isPro && openTasks.length >= FREE_TASK_LIMIT) {
      showToast(t('plan.freeLimitTasks', { n: FREE_TASK_LIMIT }), true);
      navigate('/subscription');
      return;
    }
    setEditing(null);
    setSheet('form');
  };
  const openEdit = useCallback((task) => {
    setEditing(task);
    setSheet('form');
  }, []);

  const saveTask = (data) => {
    if (data.id) {
      setTasks((prev) => prev.map((x) => (x.id === data.id ? sanitizeTask({ ...x, ...data, meta: undefined }) : x)));
      showToast(t('toast.updated'));
    } else {
      const task = sanitizeTask({ ...data, id: newId(), createdAt: new Date().toISOString() });
      setTasks((prev) => [...prev, task]);
      showToast(t('toast.added', { title: task.title }));
    }
    setSheet(null);
  };

  const toggleDone = useCallback(
    (id) => {
      const current = tasks.find((x) => x.id === id);
      if (!current) return;
      const nowDone = !current.done;
      setTasks((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null, progress: nowDone ? 100 : Math.min(x.progress, 75) }
            : x,
        ),
      );
      setToast(nowDone ? { message: t('toast.done'), undo: { type: 'undone', id } } : { message: t('toast.undone') });
    },
    [tasks, setTasks, t],
  );

  const setProgress = useCallback(
    (id, progress) => {
      if (progress >= 100) {
        toggleDone(id);
        return;
      }
      setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, progress } : x)));
    },
    [setTasks, toggleDone],
  );

  const deleteTask = useCallback(
    (id) => {
      const index = tasks.findIndex((x) => x.id === id);
      if (index === -1) return;
      const removed = tasks[index];
      setTasks((prev) => prev.filter((x) => x.id !== id));
      setToast({ message: t('toast.deleted', { title: removed.title }), undo: { type: 'restore', task: removed, index } });
    },
    [tasks, setTasks, t],
  );

  const undo = () => {
    const u = toast?.undo;
    if (!u) return;
    if (u.type === 'restore') {
      setTasks((prev) => {
        if (prev.some((x) => x.id === u.task.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(u.index, next.length), 0, u.task);
        return next;
      });
    } else if (u.type === 'undone') {
      setTasks((prev) => prev.map((x) => (x.id === u.id ? { ...x, done: false, doneAt: null, progress: 75 } : x)));
    }
    setToast(null);
  };
  const dismissToast = useCallback(() => setToast(null), []);

  const clearDone = () => {
    const removed = tasks.filter((x) => x.done).length;
    setTasks((prev) => prev.filter((x) => !x.done));
    showToast(t('toast.cleared', { n: removed }));
  };

  const handlers = { onToggleDone: toggleDone, onProgress: setProgress, onEdit: openEdit, onDelete: deleteTask };

  // Header chip that shows the plan at a glance.
  const planChip = (() => {
    if (account.devUnlock) return { text: t('plan.dev'), cls: 'bg-slate-200 text-slate-700' };
    if (account.status !== 'user' || !account.plan) return { text: t('plan.guest'), cls: 'bg-slate-100 text-slate-600' };
    const p = account.plan;
    if (p.status === 'active') return { text: t('plan.activeShort'), cls: 'bg-indigo-600 text-white' };
    if (p.status === 'trial') return { text: t('plan.trialShort', { n: p.daysLeft }), cls: 'bg-emerald-100 text-emerald-700' };
    if (p.status === 'free') return { text: t('plan.guest'), cls: 'bg-slate-100 text-slate-600' };
    return { text: t('plan.expired'), cls: 'bg-rose-100 text-rose-700' };
  })();

  return (
    <div className="min-h-dvh pb-28 sm:pb-12">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white" aria-hidden>
            <TargetIcon width={20} height={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight">{t('app.name')}</h1>
            <p className="truncate text-xs text-slate-500">
              {openTasks.length === 0
                ? t('header.allClear')
                : t('header.summary', { n: openTasks.length, time: fmt.duration(totalRemaining) })}
            </p>
          </div>

          <nav className="hidden rounded-xl bg-slate-100 p-1 sm:flex" aria-label={t('tabs.focus')}>
            {TABS.map(({ key }) => (
              <button
                type="button"
                key={key}
                onClick={() => setTab(key)}
                aria-current={tab === key ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t(`tabs.${key}`)}
              </button>
            ))}
          </nav>

          <button type="button" className="btn-primary hidden px-3 sm:inline-flex" onClick={openNew}>
            <PlusIcon width={18} height={18} /> {t('tabs.add')}
          </button>
          <button
            type="button"
            onClick={() => openAccount()}
            aria-label={t('header.account')}
            className={`chip shrink-0 px-2.5 py-1 transition hover:opacity-90 ${planChip.cls}`}
          >
            {planChip.text}
          </button>
          <button type="button" className="icon-btn shrink-0" onClick={() => setSheet('settings')} aria-label={t('header.settings')}>
            <SettingsIcon />
          </button>
        </div>

        {tasks.length > 0 && (
          <div className="mx-auto max-w-3xl px-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${weekProgress}%` }} />
              </div>
              <span className="text-xs font-medium text-slate-500">{t('header.doneThisWeek', { n: doneThisWeek })}</span>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        <PlanBanner />

        {tasks.length === 0 ? (
          <EmptyState onAdd={openNew} onSample={() => setTasks(sampleTasks(new Date(), t))} />
        ) : (
          <>
            {tab === 'focus' && (
              <div className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-3">
                  <DoThisFirst ranked={openTasks} now={now} onToggleDone={toggleDone} onProgress={setProgress} onOpen={openEdit} />
                </div>
                <div className="md:col-span-2">
                  <TodayPlan plan={plan} taskById={taskById} now={now} />
                </div>
              </div>
            )}

            {tab === 'tasks' && (
              <TaskList ranked={openTasks} tasks={tasks} now={now} handlers={handlers} onClearDone={clearDone} />
            )}

            {tab === 'week' &&
              (account.isPro ? (
                <WeekPlan plan={plan} taskById={taskById} now={now} />
              ) : (
                <ProLock title={t('plan.weekLocked')} desc={t('plan.weekLockedDesc')} />
              ))}
          </>
        )}
      </main>

      {/* Mobile bottom navigation with a centered add button */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pt-2 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 items-center px-2">
          <TabButton active={tab === 'focus'} label={t('tabs.focus')} Icon={TargetIcon} onClick={() => setTab('focus')} />
          <TabButton active={tab === 'tasks'} label={t('tabs.tasks')} Icon={ListIcon} onClick={() => setTab('tasks')} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openNew}
              aria-label={t('tabs.addHomework')}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <PlusIcon width={26} height={26} strokeWidth={2.5} />
            </button>
          </div>
          <TabButton active={tab === 'week'} label={t('tabs.week')} Icon={CalendarIcon} onClick={() => setTab('week')} />
        </div>
      </nav>

      <TaskForm open={sheet === 'form'} task={editing} subjects={subjects} onSave={saveTask} onClose={closeSheet} />
      <SettingsPanel
        open={sheet === 'settings'}
        settings={settings}
        tasks={tasks}
        onClose={closeSheet}
        onOpenAccount={() => {
          if (account.status === 'guest') openAccount('login');
          else {
            setSheet(null);
            navigate('/subscription');
          }
        }}
        onSave={(s) => {
          setSettings(s);
          setSheet(null);
          showToast(t('toast.settingsSaved'));
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
      <AccountSheet
        open={sheet === 'account'}
        initialMode={accountMode}
        onClose={closeSheet}
        onToast={showToast}
        onAdmin={() => setSheet('admin')}
      />
      <AdminSheet open={sheet === 'admin'} onClose={() => setSheet('account')} onToast={showToast} />
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
