import { PRIORITY_LEVELS, TASK_TYPES } from '../lib/constants.js';
import { priorityReason } from '../lib/priority.js';
import { useI18n } from '../i18n/index.jsx';
import { AlertIcon, CheckIcon, ClockIcon, EditIcon, TrashIcon } from './Icons.jsx';

export function ProgressBar({ value, className = 'bg-indigo-500' }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-all duration-300 ${className}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function PriorityChip({ level }) {
  const { t } = useI18n();
  return <span className={`chip ${PRIORITY_LEVELS[level].chip}`}>{t(`priority.${level}`)}</span>;
}

/** A single task with done toggle, progress shortcuts, edit and delete. */
export default function TaskCard({ task, now, onToggleDone, onProgress, onEdit, onDelete, showReason = false }) {
  const { t, fmt } = useI18n();
  const type = TASK_TYPES[task.type] ?? TASK_TYPES.quick;
  const meta = task.meta;
  const level = PRIORITY_LEVELS[meta?.level ?? 'low'];

  return (
    <article className={`card relative overflow-hidden p-4 ${task.done ? 'opacity-60' : ''}`}>
      {!task.done && <span className={`absolute inset-y-0 left-0 w-1 ${level.bar}`} aria-hidden />}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleDone(task.id)}
          aria-label={task.done ? t('card.markUndone') : t('card.markDone')}
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
            task.done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'
          }`}
        >
          <CheckIcon width={16} height={16} strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{task.subject}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">
              {type.emoji} {t(`types.${task.type}`)}
            </span>
            {!task.done && meta && <PriorityChip level={meta.level} />}
            {!task.done && meta?.atRisk && (
              <span className="chip bg-rose-50 text-rose-700">
                <AlertIcon width={12} height={12} /> {t('card.tight')}
              </span>
            )}
          </div>
          <h3 className={`break-words font-semibold leading-snug ${task.done ? 'line-through' : ''}`}>{task.title}</h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className={meta?.overdue ? 'font-semibold text-rose-600' : ''}>{fmt.due(task.due, now)}</span>
            {!task.done && meta && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon width={14} height={14} />
                {t('card.left', { time: fmt.duration(meta.remaining) })}
              </span>
            )}
          </div>

          {showReason && meta && !task.done && <p className="mt-1.5 text-sm text-slate-600">{t(priorityReason(meta))}</p>}
          {task.notes && <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{task.notes}</p>}

          {!task.done && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <ProgressBar value={task.progress} />
              </div>
              <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-500">{task.progress}%</span>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            {!task.done ? (
              <div className="flex gap-1">
                {[25, 50, 75].map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => onProgress(task.id, p)}
                    className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                      task.progress >= p ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    aria-label={t('card.setProgress', { n: p })}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs text-emerald-600">
                {task.doneAt ? t('card.doneOn', { date: fmt.date(task.doneAt, { day: 'numeric', month: 'short' }) }) : t('card.done')}
              </span>
            )}
            <div className="flex">
              <button type="button" className="icon-btn" onClick={() => onEdit(task)} aria-label={t('card.edit')}>
                <EditIcon width={18} height={18} />
              </button>
              <button
                type="button"
                className="icon-btn hover:text-rose-600"
                onClick={() => onDelete(task.id)}
                aria-label={t('card.delete')}
              >
                <TrashIcon width={18} height={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
