import { useEffect, useRef, useState } from 'react';
import Sheet from './Sheet.jsx';
import { DEFAULT_SETTINGS, WEEKDAYS } from '../lib/constants.js';
import { reviveSettings, reviveTasks } from '../lib/storage.js';
import { formatDuration } from '../lib/time.js';

/** Free-time, focus-block and data settings. */
export default function SettingsPanel({ open, settings, tasks, onSave, onImport, onReset, onClose }) {
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setMessage('');
    }
  }, [open, settings]);

  const setDay = (i, value) =>
    setDraft((d) => ({ ...d, dailyMinutes: d.dailyMinutes.map((m, j) => (j === i ? value : m)) }));

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks, settings }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homework-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file) => {
    try {
      const data = JSON.parse(await file.text());
      const importedTasks = reviveTasks(data.tasks);
      if (!Array.isArray(data.tasks)) throw new Error('No tasks found');
      onImport(importedTasks, data.settings ? reviveSettings(data.settings) : null);
      setMessage(`Imported ${importedTasks.length} task${importedTasks.length === 1 ? '' : 's'}.`);
    } catch {
      setMessage('That file is not a valid backup.');
    }
  };

  const weeklyTotal = draft.dailyMinutes.reduce((s, m) => s + Math.min(Number(m) || 0, draft.maxDailyMinutes), 0);

  return (
    <Sheet
      open={open}
      title="Settings"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary flex-[2]" onClick={() => onSave(reviveSettings(draft))}>
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="font-semibold">Free study time per day</h3>
          <p className="mb-3 text-sm text-slate-500">
            How much time you realistically have for homework after school, clubs and rest. Total:{' '}
            <span className="font-semibold text-slate-700">{formatDuration(weeklyTotal)}/week</span>
          </p>
          <div className="space-y-2.5">
            {WEEKDAYS.map((name, i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-10 text-sm font-medium text-slate-600">{name}</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={draft.dailyMinutes[i]}
                  onChange={(e) => setDay(i, Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                  aria-label={`Free minutes on ${name}`}
                />
                <span className="w-16 text-right text-sm font-semibold tabular-nums">
                  {draft.dailyMinutes[i] === 0 ? 'Off' : formatDuration(draft.dailyMinutes[i])}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="field-label" htmlFor="maxDaily">
              Burnout limit: max per day
            </label>
            <div className="flex items-center gap-3">
              <input
                id="maxDaily"
                type="range"
                min={30}
                max={480}
                step={15}
                value={draft.maxDailyMinutes}
                onChange={(e) => setDraft((d) => ({ ...d, maxDailyMinutes: Number(e.target.value) }))}
                className="flex-1 accent-indigo-600"
              />
              <span className="w-16 text-right text-sm font-semibold tabular-nums">{formatDuration(draft.maxDailyMinutes)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">The planner never schedules more than this in one day.</p>
          </div>
          <div>
            <label className="field-label" htmlFor="block">Focus block</label>
            <select
              id="block"
              className="field"
              value={draft.blockMinutes}
              onChange={(e) => setDraft((d) => ({ ...d, blockMinutes: Number(e.target.value) }))}
            >
              {[25, 30, 45, 50, 60, 90].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="break">Break</label>
            <select
              id="break"
              className="field"
              value={draft.breakMinutes}
              onChange={(e) => setDraft((d) => ({ ...d, breakMinutes: Number(e.target.value) }))}
            >
              {[0, 5, 10, 15, 20].map((m) => (
                <option key={m} value={m}>{m === 0 ? 'None' : `${m} min`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="start">Study starts at</label>
            <input
              id="start"
              type="time"
              className="field"
              value={draft.studyStart}
              onChange={(e) => setDraft((d) => ({ ...d, studyStart: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="days">Plan ahead</label>
            <select
              id="days"
              className="field"
              value={draft.planDays}
              onChange={(e) => setDraft((d) => ({ ...d, planDays: Number(e.target.value) }))}
            >
              {[3, 5, 7, 10, 14].map((n) => (
                <option key={n} value={n}>{n} days</option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-2xl bg-slate-50 p-4">
          <h3 className="font-semibold">Your data</h3>
          <p className="mb-3 text-sm text-slate-500">
            Everything is stored only in this browser. Export a backup to move it to another device.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-soft" onClick={exportData}>Export backup</button>
            <button type="button" className="btn-soft" onClick={() => fileRef.current?.click()}>Import backup</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn text-rose-600 hover:bg-rose-50"
              onClick={() => {
                if (window.confirm('Delete ALL tasks and reset settings? This cannot be undone.')) {
                  onReset();
                  setDraft(DEFAULT_SETTINGS);
                  setMessage('Everything was reset.');
                }
              }}
            >
              Reset everything
            </button>
          </div>
          {message && <p className="mt-2 text-sm font-medium text-indigo-700">{message}</p>}
        </section>
      </div>
    </Sheet>
  );
}
