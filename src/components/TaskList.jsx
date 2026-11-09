import { useMemo, useState } from 'react';
import TaskCard from './TaskCard.jsx';

const FILTERS = [
  { key: 'open', label: 'To do' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'All' },
];

/** All tasks, ranked by priority, with filter + subject chips. */
export default function TaskList({ ranked, tasks, now, handlers, onClearDone }) {
  const [filter, setFilter] = useState('open');
  const [subject, setSubject] = useState('');

  const subjects = useMemo(() => [...new Set(tasks.map((t) => t.subject))].sort(), [tasks]);
  const done = useMemo(
    () => tasks.filter((t) => t.done).sort((a, b) => new Date(b.doneAt || 0) - new Date(a.doneAt || 0)),
    [tasks],
  );

  const list = (filter === 'open' ? ranked : filter === 'done' ? done : [...ranked, ...done]).filter(
    (t) => !subject || t.subject === subject,
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Filter tasks">
          {FILTERS.map((f) => (
            <button
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                filter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
              <span className="ml-1 text-xs font-medium text-slate-400">
                {f.key === 'open' ? ranked.length : f.key === 'done' ? done.length : tasks.length}
              </span>
            </button>
          ))}
        </div>
        {filter === 'done' && done.length > 0 && (
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={onClearDone}>
            Clear done
          </button>
        )}
      </div>

      {subjects.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {['', ...subjects].map((s) => (
            <button
              type="button"
              key={s || 'all'}
              onClick={() => setSubject(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                subject === s ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200'
              }`}
            >
              {s || 'All subjects'}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">
          {filter === 'done' ? 'Nothing finished yet. You got this!' : 'No tasks here. 🎉'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {list.map((t) => (
            <TaskCard key={t.id} task={t} now={now} showReason={!t.done} {...handlers} />
          ))}
        </div>
      )}
    </section>
  );
}
