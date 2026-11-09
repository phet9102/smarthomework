import { TASK_TYPES } from '../lib/constants.js';
import { priorityReason } from '../lib/priority.js';
import { useI18n } from '../i18n/index.jsx';
import { CheckIcon, ClockIcon, FlameIcon } from './Icons.jsx';
import { PriorityChip, ProgressBar } from './TaskCard.jsx';

/** The hero: the single most important task, plus the next two in line. */
export default function DoThisFirst({ ranked, now, onToggleDone, onProgress, onOpen }) {
  const { t, fmt } = useI18n();

  if (ranked.length === 0) {
    return (
      <div className="card px-6 py-10 text-center">
        <p className="text-4xl" aria-hidden>🎉</p>
        <h2 className="mt-3 text-xl font-bold">{t('dtf.allDone')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('dtf.allDoneDesc')}</p>
      </div>
    );
  }

  const [top, ...rest] = ranked;
  const next = rest.slice(0, 2);
  const type = TASK_TYPES[top.type] ?? TASK_TYPES.quick;
  const nextStep = Math.min(100, top.progress + 25);

  return (
    <section aria-labelledby="dtf-title">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden />
        <div className="relative">
          <p id="dtf-title" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-100">
            <FlameIcon width={14} height={14} /> {t('dtf.label')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-indigo-100">
            <span className="font-semibold text-white">{top.subject}</span>
            <span>·</span>
            <span>
              {type.emoji} {t(`types.${top.type}`)}
            </span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
              {top.meta.overdue ? t('dtf.overdue') : t('dtf.score', { n: top.meta.score })}
            </span>
          </div>
          <h2 className="mt-1 break-words text-2xl font-bold leading-tight">{top.title}</h2>
          <p className="mt-1 text-sm text-indigo-100">{t(priorityReason(top.meta))}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <p className="text-xs text-indigo-200">{t('dtf.deadline')}</p>
              <p className="font-semibold">{fmt.due(top.due, now)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <p className="text-xs text-indigo-200">{t('dtf.timeNeeded')}</p>
              <p className="flex items-center gap-1 font-semibold">
                <ClockIcon width={14} height={14} /> {fmt.duration(top.meta.remaining)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={top.progress} className="bg-white" />
            </div>
            <span className="text-xs font-semibold tabular-nums">{top.progress}%</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => onToggleDone(top.id)} className="btn flex-1 bg-white text-indigo-700 hover:bg-indigo-50">
              <CheckIcon width={18} height={18} /> {t('dtf.done')}
            </button>
            {nextStep < 100 && (
              <button
                type="button"
                onClick={() => onProgress(top.id, nextStep)}
                className="btn flex-1 bg-white/15 text-white hover:bg-white/25"
              >
                {t('dtf.progress')}
              </button>
            )}
          </div>
        </div>
      </div>

      {next.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="section-title px-1">{t('dtf.upNext')}</p>
          {next.map((task) => (
            <button
              type="button"
              key={task.id}
              onClick={() => onOpen(task)}
              className="card flex w-full items-center gap-3 p-3 text-left transition hover:ring-indigo-200"
            >
              <span className="text-xl" aria-hidden>
                {(TASK_TYPES[task.type] ?? TASK_TYPES.quick).emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{task.title}</span>
                <span className="block truncate text-xs text-slate-500">
                  {task.subject} · {fmt.due(task.due, now)} · {fmt.duration(task.meta.remaining)}
                </span>
              </span>
              <PriorityChip level={task.meta.level} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
