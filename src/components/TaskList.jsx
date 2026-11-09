import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import TaskCard from './TaskCard.jsx';

const FILTERS = ['open', 'done', 'all'];

/** All tasks, ranked by priority, with filter + subject chips. */
export default function TaskList({ ranked, tasks, now, handlers, onClearDone }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState('open');
  const [subject, setSubject] = useState('');

  const subjects = useMemo(() => [...new Set(tasks.map((x) => x.subject))].sort(), [tasks]);
  const done = useMemo(
    () => tasks.filter((x) => x.done).sort((a, b) => new Date(b.doneAt || 0) - new Date(a.doneAt || 0)),
    [tasks],
  );
  const counts = { open: ranked.length, done: done.length, all: tasks.length };

  const list = (filter === 'open' ? ranked : filter === 'done' ? done : [...ranked, ...done]).filter(
    (x) => !subject || x.subject === subject,
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label={t('list.filterLabel')}>
          {FILTERS.map((key) => (
            <button
              type="button"
              role="tab"
              aria-selected={filter === key}
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t(`list.${key}`)}
              <span className="ml-1 text-xs font-medium text-slate-400">{counts[key]}</span>
            </button>
          ))}
        </div>
        {filter === 'done' && done.length > 0 && (
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={onClearDone}>
            {t('list.clearDone')}
          </button>
        )}
      </div>

      {subjects.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {['', ...subjects].map((s) => (
            <button
              type="button"
              key={s || '__all'}
              onClick={() => setSubject(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                subject === s ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200'
              }`}
            >
              {s || t('list.allSubjects')}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">
          {filter === 'done' ? t('list.emptyDone') : t('list.emptyOpen')}
        </p>
      ) : (
        <div className="space-y-2.5">
          {list.map((task) => (
            <TaskCard key={task.id} task={task} now={now} showReason={!task.done} {...handlers} />
          ))}
        </div>
      )}
    </section>
  );
}
