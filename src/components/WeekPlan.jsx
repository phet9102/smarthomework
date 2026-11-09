import { TASK_TYPES } from '../lib/constants.js';
import { formatDayHeading, formatDuration } from '../lib/time.js';
import { WorkloadMeter } from './TodayPlan.jsx';

/** Multi-day view of how the planner split the work. */
export default function WeekPlan({ plan, taskById, now }) {
  const totalPlanned = plan.days.reduce((s, d) => s + d.used, 0);
  const totalFree = plan.days.reduce((s, d) => s + d.capacity, 0);

  return (
    <section className="space-y-3">
      <div className="card p-4">
        <p className="section-title">Next {plan.days.length} days</p>
        <p className="mt-1 text-2xl font-bold">
          {formatDuration(totalPlanned)}{' '}
          <span className="text-base font-medium text-slate-500">of {formatDuration(totalFree)} free time</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Big tasks and exam prep are split into smaller daily sessions so you never have to cram.
        </p>
      </div>

      {plan.days.map((day) => (
        <article key={day.key} className="card p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-bold">{formatDayHeading(day.date, now)}</h3>
            <span className="text-xs text-slate-500">
              {day.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
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
                    <span className="text-sm font-semibold tabular-nums text-slate-700">{formatDuration(item.minutes)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Nothing planned. Free day.</p>
          )}
        </article>
      ))}
    </section>
  );
}
