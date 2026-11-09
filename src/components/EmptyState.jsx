import { PlusIcon } from './Icons.jsx';

export default function EmptyState({ onAdd, onSample }) {
  return (
    <section className="card px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl" aria-hidden>
        📚
      </div>
      <h2 className="mt-4 text-xl font-bold">No homework yet</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
        Add your assignments and the app will tell you what to do first, how long it takes, and when to do it.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" className="btn-primary" onClick={onAdd}>
          <PlusIcon width={18} height={18} /> Add your first task
        </button>
        <button type="button" className="btn-soft" onClick={onSample}>
          Try with sample tasks
        </button>
      </div>
    </section>
  );
}
