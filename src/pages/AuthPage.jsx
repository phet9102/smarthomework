import AuthForm from '../components/AuthForm.jsx';
import { Link, navigate } from '../lib/router.jsx';
import { LANGUAGES, useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';
import { CheckIcon, TargetIcon } from '../components/Icons.jsx';

/**
 * /login and /signup: the app at / requires a confirmed, logged-in account.
 * Big welcome panel on desktop, form-first on mobile.
 */
export default function AuthPage({ mode = 'login' }) {
  const { t, lang, setLang } = useI18n();
  const account = useAccount();

  const features = [t('authPage.f1'), t('authPage.f2'), t('authPage.f3'), t('authPage.f4')];

  return (
    <div className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" aria-hidden />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><TargetIcon /></span>
          <span className="text-lg font-bold">{t('app.name')}</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight">{t('authPage.headline')}</h1>
          <p className="mt-4 max-w-md text-lg text-indigo-100">{t('authPage.sub')}</p>
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20"><CheckIcon width={14} height={14} strokeWidth={3} /></span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-indigo-200">{t('authPage.trialNote', { n: account.pricing.trialDays })}</p>
      </section>

      <section className="flex min-h-dvh flex-col px-4 py-6 lg:min-h-0 lg:justify-center lg:px-16">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><TargetIcon width={20} height={20} /></span>
            <span className="text-base font-bold">{t('app.name')}</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm flex-1 lg:flex-none">
          <h2 className="text-2xl font-bold">{mode === 'signup' ? t('authPage.signupTitle') : t('authPage.loginTitle')}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">{t('authPage.mustLogin')}</p>

          {account.status === 'offline' && (
            <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t('auth.offline')}</p>
          )}

          <div className="card p-5">
            <AuthForm
              initialMode={mode === 'signup' ? 'register' : 'login'}
              onDone={() => navigate('/', { replace: true })}
            />
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            <Link to="/subscription" className="font-semibold text-indigo-600 hover:underline">{t('sub.seePlans')}</Link>
            <span className="mx-2 text-slate-300">·</span>
            <Link to="/privacy" className="hover:underline">{t('pages.privacy')}</Link>
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-2 text-xs">
          {Object.entries(LANGUAGES).map(([code, info]) => (
            <button
              type="button"
              key={code}
              onClick={() => setLang(code)}
              className={`rounded-lg px-2 py-1 ${lang === code ? 'bg-slate-200 font-semibold text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {info.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
