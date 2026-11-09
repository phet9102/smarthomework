import { useEffect, useMemo, useState } from 'react';
import Sheet from './Sheet.jsx';
import { IMPORTANCE_LEVELS, TASK_TYPES, TYPE_KEYS } from '../lib/constants.js';
import { addDays, formatDuration, startOfDay, toInputDateTime } from '../lib/time.js';

const ESTIMATE_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240];

function defaultDue() {
  const d = addDays(startOfDay(new Date()), 1);
  d.setHours(8, 0, 0, 0); // tomorrow, start of school
  return toInputDateTime(d);
}

function emptyDraft() {
  return {
    subject: '',
    title: '',
    type: 'quick',
    due: defaultDue(),
    importance: 3,
    estimate: TASK_TYPES.quick.defaultMinutes,
    estimateTouched: false,
    progress: 0,
    notes: '',
  };
}

/** Quick add / edit form. `task` = existing task when editing. */
export default function TaskForm({ open, task, subjects, onSave, onClose }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setDraft(
      task
        ? {
            ...task,
            due: toInputDateTime(task.due),
            estimateTouched: true,
          }
        : emptyDraft(),
    );
  }, [open, task]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const quickDates = useMemo(() => {
    const today = startOfDay(new Date());
    const mk = (days, h) => {
      const d = addDays(today, days);
      d.setHours(h, 0, 0, 0);
      return toInputDateTime(d);
    };
    return [
      { label: 'Tonight', value: mk(0, 22) },
      { label: 'Tomorrow', value: mk(1, 8) },
      { label: 'In 3 days', value: mk(3, 8) },
      { label: 'Next week', value: mk(7, 8) },
    ];
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickType = (type) =>
    set({
      type,
      // Only overwrite the estimate if the student hasn't set one themselves.
      ...(draft.estimateTouched ? {} : { estimate: TASK_TYPES[type].defaultMinutes }),
    });

  const submit = (e) => {
    e.preventDefault();
    const title = draft.title.trim();
    const subject = draft.subject.trim();
    if (!subject) return setError('Add a subject, e.g. "Math".');
    if (!title) return setError('Give the task a short title.');
    const due = new Date(draft.due);
    if (Number.isNaN(due.getTime())) return setError('Pick a valid due date.');
    const estimate = Math.round(Number(draft.estimate));
    if (!Number.isFinite(estimate) || estimate < 5) return setError('Estimate must be at least 5 minutes.');

    onSave({
      ...(task || {}),
      subject,
      title,
      type: draft.type,
      due: due.toISOString(),
      importance: Number(draft.importance),
      estimate,
      progress: Number(draft.progress) || 0,
      notes: draft.notes.trim(),
    });
  };

  return (
    <Sheet
      open={open}
      title={task ? 'Edit task' : 'New homework'}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn-primary flex-[2]">
            {task ? 'Save changes' : 'Add task'}
          </button>
        </div>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <label className="field-label" htmlFor="subject">Subject</label>
            <input
              id="subject"
              className="field"
              list="subject-list"
              placeholder="Math"
              autoComplete="off"
              value={draft.subject}
              onChange={(e) => set({ subject: e.target.value })}
              maxLength={40}
            />
            <datalist id="subject-list">
              {subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="col-span-3">
            <label className="field-label" htmlFor="title">Task</label>
            <input
              id="title"
              className="field"
              placeholder="Exercise 4.3"
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              maxLength={120}
            />
          </div>
        </div>

        <fieldset>
          <legend className="field-label">Type</legend>
          <div className="flex flex-wrap gap-2">
            {TYPE_KEYS.map((key) => {
              const t = TASK_TYPES[key];
              const active = draft.type === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => pickType(key)}
                  aria-pressed={active}
                  className={`rounded-xl px-3 py-2 text-sm font-medium ring-1 transition ${
                    active
                      ? 'bg-indigo-600 text-white ring-indigo-600'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="mr-1">{t.emoji}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label className="field-label" htmlFor="due">Due</label>
          <input
            id="due"
            type="datetime-local"
            className="field"
            value={draft.due}
            onChange={(e) => set({ due: e.target.value })}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickDates.map((q) => (
              <button
                type="button"
                key={q.label}
                onClick={() => set({ due: q.value })}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  draft.due === q.value ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="field-label">
            Importance{' '}
            <span className="font-normal text-slate-400">
              · {IMPORTANCE_LEVELS[draft.importance - 1]?.hint}
            </span>
          </legend>
          <div className="grid grid-cols-5 gap-1.5">
            {IMPORTANCE_LEVELS.map((lvl) => {
              const active = Number(draft.importance) === lvl.value;
              return (
                <button
                  type="button"
                  key={lvl.value}
                  onClick={() => set({ importance: lvl.value })}
                  aria-pressed={active}
                  className={`rounded-xl py-2 text-xs font-semibold ring-1 transition ${
                    active ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="field-label" htmlFor="estimate">Estimated time</label>
            <span className="text-sm font-semibold text-indigo-600">{formatDuration(draft.estimate || 0)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ESTIMATE_PRESETS.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => set({ estimate: m, estimateTouched: true })}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  Number(draft.estimate) === m ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {formatDuration(m)}
              </button>
            ))}
            <input
              id="estimate"
              type="number"
              min={5}
              step={5}
              inputMode="numeric"
              aria-label="Estimated minutes"
              className="field w-24 py-1 text-sm"
              value={draft.estimate}
              onChange={(e) => set({ estimate: e.target.value, estimateTouched: true })}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Default for {TASK_TYPES[draft.type].label}: {formatDuration(TASK_TYPES[draft.type].defaultMinutes)}.
            {TASK_TYPES[draft.type].spread && ' Will be split across several days.'}
          </p>
        </div>

        {task && (
          <div>
            <div className="flex items-baseline justify-between">
              <label className="field-label" htmlFor="progress">Progress</label>
              <span className="text-sm font-semibold text-slate-700">{draft.progress}%</span>
            </div>
            <input
              id="progress"
              type="range"
              min={0}
              max={100}
              step={5}
              className="w-full accent-indigo-600"
              value={draft.progress}
              onChange={(e) => set({ progress: Number(e.target.value) })}
            />
          </div>
        )}

        <div>
          <label className="field-label" htmlFor="notes">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="notes"
            rows={2}
            className="field resize-none"
            placeholder="Pages, group members, teacher tips…"
            value={draft.notes}
            onChange={(e) => set({ notes: e.target.value })}
            maxLength={500}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
