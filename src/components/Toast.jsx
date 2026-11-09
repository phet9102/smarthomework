import { useEffect } from 'react';
import { UndoIcon } from './Icons.jsx';

/** Small bottom toast with an optional Undo action; auto-hides after 5s. */
export default function Toast({ toast, onUndo, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 sm:bottom-6" role="status" aria-live="polite">
      <div className="pointer-events-auto flex animate-sheet items-center gap-3 rounded-2xl bg-slate-900 py-2.5 pl-4 pr-2 text-sm text-white shadow-lg">
        <span>{toast.message}</span>
        {toast.undo && (
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-indigo-300 hover:bg-white/10"
          >
            <UndoIcon width={16} height={16} /> Undo
          </button>
        )}
      </div>
    </div>
  );
}
