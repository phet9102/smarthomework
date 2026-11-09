import { TASK_TYPES } from '../lib/constants.js';
import { useI18n } from '../i18n/index.jsx';
import { WorkloadMeter } from './TodayPlan.jsx';

/** Multi-day view of how the planner split the work. */
export default function WeekPlan({ plan, taskById, now }) {
  const { t, fmt } = useI18n();
  const totalPlanned = plan.days.reduce((s, d) => s + d.used, 0);
  const totalFree = plan.days.reduce((s, d) => s + d.capacity, 0);

  return (
    <section className="space-y-3">
      <div className="card p-4">
        <p className="section-title">{t('week.nextDays', { n: plan.days.length })}</p>
        <p className="mt-1 text-2xl font-bold">
          {fmt.duration(totalPlanned)}{' '}
          <span className="text-base font-medium text-slate-500">{t('week.ofFree', { time: fmt.duration(totalFree) })}</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">{t('week.desc')}</p>
      </div>

      {plan.days.map((day) => (
        <article key={day.key} className="card p-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="font-bold">{fmt.dayHeading(day.date, now)}</h3>
            <span className="text-xs text-slate-500">{fmt.date(day.date, { day: 'numeric', month: 'short' })}</span>
          </div>
          <WorkloadMeter day={day} compact />
          {day.items.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {day.items.map((item) => {
                const task = taskById.get(item.taskId);
                if (!task) return null;
                return (
                  <li key={item.taskId} className="flex items-center gap-3 py-2">
                    <span aria-hidden>{(TASK_TYPES[task.type] ?? TASK_TYPES.quick).emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{task.title}</span>
                      <span className="block truncate text-xs text-slate-500">{task.subject}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-700">{fmt.duration(item.minutes)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">{t('week.nothing')}</p>
          )}
        </article>
      ))}
    </section>
  );
}
