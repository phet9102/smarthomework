import { useEffect, useMemo, useState } from 'react';
import Sheet from './Sheet.jsx';
import { IMPORTANCE_LEVELS, TASK_TYPES, TYPE_KEYS } from '../lib/constants.js';
import { addDays, startOfDay, toInputDateTime } from '../lib/time.js';
import { useI18n } from '../i18n/index.jsx';

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
  const { t, fmt } = useI18n();
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
      { label: 'form.tonight', value: mk(0, 22) },
      { label: 'form.tomorrow', value: mk(1, 8) },
      { label: 'form.in3', value: mk(3, 8) },
      { label: 'form.nextWeek', value: mk(7, 8) },
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
    if (!subject) return setError(t('form.errSubject'));
    if (!title) return setError(t('form.errTitle'));
    const due = new Date(draft.due);
    if (Number.isNaN(due.getTime())) return setError(t('form.errDue'));
    const estimate = Math.round(Number(draft.estimate));
    if (!Number.isFinite(estimate) || estimate < 5) return setError(t('form.errEstimate'));

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
      title={task ? t('form.editTitle') : t('form.newTitle')}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="task-form" className="btn-primary flex-[2]">
            {task ? t('form.saveChanges') : t('form.add')}
          </button>
        </div>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <label className="field-label" htmlFor="subject">{t('form.subject')}</label>
            <input
              id="subject"
              className="field"
              list="subject-list"
              placeholder={t('form.subjectPh')}
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
            <label className="field-label" htmlFor="title">{t('form.task')}</label>
            <input
              id="title"
              className="field"
              placeholder={t('form.taskPh')}
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              maxLength={120}
            />
          </div>
        </div>

        <fieldset>
          <legend className="field-label">{t('form.type')}</legend>
          <div className="flex flex-wrap gap-2">
            {TYPE_KEYS.map((key) => {
              const typeInfo = TASK_TYPES[key];
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
                  <span className="mr-1">{typeInfo.emoji}</span>
                  {t(`types.${key}`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label className="field-label" htmlFor="due">{t('form.due')}</label>
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
                {t(q.label)}
              </button>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="field-label">
            {t('form.importance')}{' '}
            <span className="font-normal text-slate-400">· {t(`importance.${draft.importance}.hint`)}</span>
          </legend>
          <div className="grid grid-cols-5 gap-1.5">
            {IMPORTANCE_LEVELS.map((lvl) => {
              const active = Number(draft.importance) === lvl;
              return (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => set({ importance: lvl })}
                  aria-pressed={active}
                  className={`rounded-xl py-2 text-xs font-semibold ring-1 transition ${
                    active ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t(`importance.${lvl}.label`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="field-label" htmlFor="estimate">{t('form.estimate')}</label>
            <span className="text-sm font-semibold text-indigo-600">{fmt.duration(draft.estimate || 0)}</span>
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
                {fmt.duration(m)}
              </button>
            ))}
            <input
              id="estimate"
              type="number"
              min={5}
              step={5}
              inputMode="numeric"
              aria-label={t('form.estimateMinutes')}
              className="field w-24 py-1 text-sm"
              value={draft.estimate}
              onChange={(e) => set({ estimate: e.target.value, estimateTouched: true })}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {t('form.estimateHint', { type: t(`types.${draft.type}`), time: fmt.duration(TASK_TYPES[draft.type].defaultMinutes) })}
            {TASK_TYPES[draft.type].spread && t('form.spreadHint')}
          </p>
        </div>

        {task && (
          <div>
            <div className="flex items-baseline justify-between">
              <label className="field-label" htmlFor="progress">{t('form.progress')}</label>
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
            {t('form.notes')} <span className="font-normal text-slate-400">{t('common.optional')}</span>
          </label>
          <textarea
            id="notes"
            rows={2}
            className="field resize-none"
            placeholder={t('form.notesPh')}
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
