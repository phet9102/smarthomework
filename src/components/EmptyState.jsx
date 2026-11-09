import { useI18n } from '../i18n/index.jsx';
import { PlusIcon } from './Icons.jsx';

export default function EmptyState({ onAdd, onSample }) {
  const { t } = useI18n();
  return (
    <section className="card px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl" aria-hidden>
        📚
      </div>
      <h2 className="mt-4 text-xl font-bold">{t('empty.title')}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">{t('empty.desc')}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" className="btn-primary" onClick={onAdd}>
          <PlusIcon width={18} height={18} /> {t('empty.add')}
        </button>
        <button type="button" className="btn-soft" onClick={onSample}>
          {t('empty.sample')}
        </button>
      </div>
    </section>
  );
}
