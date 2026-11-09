import { TASK_TYPES } from '../lib/constants.js';
import { workloadStatus } from '../lib/scheduler.js';
import { useI18n } from '../i18n/index.jsx';
import { AlertIcon, CoffeeIcon } from './Icons.jsx';

const TONES = {
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-700' },
  amber: { bar: 'bg-amber-500', text: 'text-amber-700' },
  rose: { bar: 'bg-rose-500', text: 'text-rose-700' },
  slate: { bar: 'bg-slate-400', text: 'text-slate-600' },
};

export function WorkloadMeter({ day, compact = false }) {
  const { t, fmt } = useI18n();
  const status = workloadStatus(day);
  const tone = TONES[status.tone];
  const pct = Math.min(100, Math.round(status.ratio * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className={`font-semibold ${tone.text}`}>{t(`workload.${status.key}`)}</span>
        <span className="shrink-0 whitespace-nowrap tabular-nums text-slate-500">
          {fmt.duration(day.used)} / {fmt.duration(day.capacity)}
        </span>
      </div>
      <div className={`overflow-hidden rounded-full bg-slate-100 ${compact ? 'h-1.5' : 'h-2.5'}`}>
        <div className={`h-full rounded-full ${tone.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Today's time-blocked study plan with breaks and a burnout meter. */
export default function TodayPlan({ plan, taskById, now }) {
  const { t, fmt } = useI18n();
  const today = plan.days[0];
  const blocks = plan.todayBlocks;
  const unscheduled = plan.unscheduled.map((u) => ({ ...u, task: taskById.get(u.taskId) })).filter((u) => u.task);

  return (
    <section className="card p-4" aria-labelledby="today-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="today-title" className="text-base font-bold">{t('today.title')}</h2>
        <span className="text-xs text-slate-500">{fmt.date(now, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
      </div>

      <WorkloadMeter day={today} />

      {blocks.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
          {today.capacity === 0 ? t('today.noTimeLeft') : t('today.nothing')}
        </p>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {blocks.map((b, i) => {
            const isNow = now >= b.start && now < b.end;
            if (b.kind === 'break') {
              return (
                <li key={`b${i}`} className="flex items-center gap-3 px-2 py-1 text-xs text-slate-400">
                  <span className="w-16 tabular-nums">{fmt.clock(b.start)}</span>
                  <CoffeeIcon width={14} height={14} />
                  <span>{t('today.break', { n: b.minutes })}</span>
                </li>
              );
            }
            const task = taskById.get(b.taskId);
            if (!task) return null;
            return (
              <li
                key={`f${i}`}
                className={`flex items-center gap-3 rounded-xl px-2 py-2 ${isNow ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-slate-50'}`}
              >
                <span className="w-16 shrink-0 text-xs font-semibold tabular-nums text-slate-600">{fmt.clock(b.start)}</span>
                <span className="text-lg" aria-hidden>
                  {(TASK_TYPES[task.type] ?? TASK_TYPES.quick).emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{task.title}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {task.subject} · {fmt.duration(b.minutes)}
                  </span>
                </span>
                {isNow && <span className="chip bg-indigo-600 text-white">{t('today.now')}</span>}
              </li>
            );
          })}
        </ol>
      )}

      {unscheduled.length > 0 && (
        <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertIcon width={16} height={16} /> {t('today.shortTitle')}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {unscheduled.map((u) => (
              <li key={u.taskId}>{t('today.shortItem', { title: u.task.title, time: fmt.duration(u.minutes) })}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-rose-700">{t('today.shortTip')}</p>
        </div>
      )}
    </section>
  );
}
