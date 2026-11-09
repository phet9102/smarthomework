import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { XIcon } from './Icons.jsx';

/** Bottom sheet on mobile, centered dialog on larger screens. */
export default function Sheet({ open, title, onClose, children, footer, autoFocus = true }) {
  const { t } = useI18n();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first field for fast keyboard entry.
    const timer = window.setTimeout(() => {
      if (autoFocus) panelRef.current?.querySelector('input, select, textarea')?.focus();
    }, 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(timer);
    };
  }, [open, autoFocus]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        className="relative flex max-h-[92dvh] w-full animate-sheet flex-col rounded-t-3xl bg-white shadow-xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <XIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe border-t border-slate-100 px-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}
