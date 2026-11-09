import { TASK_TYPES } from '../lib/constants.js';
import { explainPriority } from '../lib/priority.js';
import { formatDue, formatDuration } from '../lib/time.js';
import { CheckIcon, ClockIcon, FlameIcon } from './Icons.jsx';
import { PriorityChip, ProgressBar } from './TaskCard.jsx';

/** The hero: the single most important task, plus the next two in line. */
export default function DoThisFirst({ ranked, now, onToggleDone, onProgress, onOpen }) {
  if (ranked.length === 0) return null;
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
            <FlameIcon width={14} height={14} /> Do this first
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-indigo-100">
            <span className="font-semibold text-white">{top.subject}</span>
            <span>·</span>
            <span>
              {type.emoji} {type.label}
            </span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
              {top.meta.overdue ? 'Overdue' : `Score ${top.meta.score}`}
            </span>
          </div>
          <h2 className="mt-1 break-words text-2xl font-bold leading-tight">{top.title}</h2>
          <p className="mt-1 text-sm text-indigo-100">{explainPriority(top.meta)}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <p className="text-xs text-indigo-200">Deadline</p>
              <p className="font-semibold">{formatDue(top.due, now)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <p className="text-xs text-indigo-200">Time needed</p>
              <p className="flex items-center gap-1 font-semibold">
                <ClockIcon width={14} height={14} /> {formatDuration(top.meta.remaining)}
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
            <button
              type="button"
              onClick={() => onToggleDone(top.id)}
              className="btn flex-1 bg-white text-indigo-700 hover:bg-indigo-50"
            >
              <CheckIcon width={18} height={18} /> Done
            </button>
            {nextStep < 100 && (
              <button
                type="button"
                onClick={() => onProgress(top.id, nextStep)}
                className="btn flex-1 bg-white/15 text-white hover:bg-white/25"
              >
                +25% progress
              </button>
            )}
          </div>
        </div>
      </div>

      {next.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="section-title px-1">Up next</p>
          {next.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => onOpen(t)}
              className="card flex w-full items-center gap-3 p-3 text-left transition hover:ring-indigo-200"
            >
              <span className="text-xl" aria-hidden>
                {(TASK_TYPES[t.type] ?? TASK_TYPES.quick).emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t.title}</span>
                <span className="block truncate text-xs text-slate-500">
                  {t.subject} · {formatDue(t.due, now)} · {formatDuration(t.meta.remaining)}
                </span>
              </span>
              <PriorityChip level={t.meta.level} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
