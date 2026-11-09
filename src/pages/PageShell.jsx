import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';
import { Link } from '../lib/router.jsx';
import { TargetIcon } from '../components/Icons.jsx';

/** Layout for the standalone pages (/subscription, /trial, /pay, /receipt). */
export default function PageShell({ children, wide = false }) {
  const { t } = useI18n();
  const { user } = useAccount();
  return (
    <div className="min-h-dvh pb-12">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur">
        <div className={`mx-auto flex items-center gap-3 px-4 py-3 ${wide ? 'max-w-4xl' : 'max-w-lg'}`}>
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white" aria-hidden>
              <TargetIcon width={20} height={20} />
            </span>
            <span className="truncate text-base font-bold">{t('app.name')}</span>
          </Link>
          {user && <span className="hidden truncate text-xs text-slate-500 sm:block">{user.email}</span>}
          <Link to="/" className="btn-ghost shrink-0 px-3 py-1.5 text-sm">
            ← {t('pages.backToApp')}
          </Link>
        </div>
      </header>
      <main className={`mx-auto px-4 pt-5 ${wide ? 'max-w-4xl' : 'max-w-lg'}`}>{children}</main>
    </div>
  );
}

export function PageMessage({ emoji, title, desc, children }) {
  return (
    <section className="card px-6 py-10 text-center">
      {emoji && <p className="text-5xl" aria-hidden>{emoji}</p>}
      <h1 className="mt-3 text-xl font-bold">{title}</h1>
      {desc && <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{desc}</p>}
      {children && <div className="mt-6 flex flex-col items-center gap-2">{children}</div>}
    </section>
  );
}
