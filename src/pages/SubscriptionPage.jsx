import { useState } from 'react';
import PageShell from './PageShell.jsx';
import AuthForm from '../components/AuthForm.jsx';
import { PlanCompare } from '../components/AccountSheet.jsx';
import { api, errorKey } from '../lib/api.js';
import { FREE_TASK_LIMIT } from '../lib/constants.js';
import { navigate, Link } from '../lib/router.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';
import { CheckIcon } from '../components/Icons.jsx';

function Feature({ children }) {
  return (
    <li className="flex items-start gap-2">
      <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

/** /subscription: Free · 14-day trial · Pro (PromptPay, monthly). */
export default function SubscriptionPage() {
  const { t, fmt } = useI18n();
  const account = useAccount();
  const { pricing, plan, status, openPayment } = account;
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [needAuth, setNeedAuth] = useState(false);

  const trialAvailable = status !== 'user' || plan?.trialAvailable;
  const price = pricing.priceThb;

  const startTrial = async () => {
    setBusy('trial');
    setError('');
    try {
      const r = await api('/trial/links', { method: 'POST' });
      navigate(`/trial/${r.token}`);
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy('');
    }
  };

  // `justLoggedIn` skips the guest check right after AuthForm succeeds (state has not re-rendered yet).
  const checkout = async (justLoggedIn = false) => {
    if (status !== 'user' && !justLoggedIn) {
      setNeedAuth(true);
      return;
    }
    setBusy('pay');
    setError('');
    try {
      const r = await api('/billing/checkout', { method: 'POST', body: { months } });
      account.setOpenPayment(r.payment);
      navigate(`/pay/${r.payment.id}`);
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy('');
    }
  };

  return (
    <PageShell wide>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('sub.title')}</h1>
        <p className="mt-2 text-slate-500">{t('sub.subtitle')}</p>
        {status === 'user' && plan && (
          <p className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-sm ring-1 ring-slate-200">
            {t('sub.current')}{' '}
            <span className="font-semibold">
              {plan.status === 'active'
                ? t('plan.active', { date: fmt.date(plan.endsAt) })
                : plan.status === 'trial'
                  ? t('plan.trial', { n: plan.daysLeft })
                  : plan.status === 'free'
                    ? t('plan.guest')
                    : t('plan.expired')}
            </span>
          </p>
        )}
      </div>

      {openPayment && (
        <Link
          to={openPayment.status === 'submitted' ? `/receipt/${openPayment.id}` : `/pay/${openPayment.id}`}
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-100"
        >
          <span>{t('sub.openPayment', { amount: fmt.money(openPayment.amount), status: t(`payStatus.${openPayment.status}`) })}</span>
          <span className="font-bold">→</span>
        </Link>
      )}

      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Free */}
        <section className="card flex flex-col p-5">
          <h2 className="font-bold">{t('pricing.free')}</h2>
          <p className="mt-2 text-3xl font-bold">฿0</p>
          <p className="text-sm text-slate-500">{t('sub.freeDesc')}</p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            <Feature>{t('pricing.featPriority')}</Feature>
            <Feature>{t('sub.freeTasks', { n: FREE_TASK_LIMIT })}</Feature>
            <Feature>{t('sub.backup')}</Feature>
          </ul>
          <Link to="/" className="btn-soft mt-5 w-full">{t('sub.freeCta')}</Link>
        </section>

        {/* Trial */}
        <section className="card relative flex flex-col p-5 ring-2 ring-emerald-400">
          <span className="chip absolute -top-3 left-5 bg-emerald-500 text-white">{t('sub.recommended')}</span>
          <h2 className="font-bold">{t('sub.trialTitle', { n: pricing.trialDays })}</h2>
          <p className="mt-2 text-3xl font-bold">฿0</p>
          <p className="text-sm text-slate-500">{t('sub.trialDesc', { n: pricing.trialDays })}</p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            <Feature>{t('sub.allPro')}</Feature>
            <Feature>{t('sub.noCard')}</Feature>
            <Feature>{t('sub.noAutoCharge')}</Feature>
          </ul>
          <button
            type="button"
            className="btn mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!trialAvailable || busy === 'trial'}
            onClick={startTrial}
          >
            {!trialAvailable ? t('sub.trialUsed') : busy === 'trial' ? t('common.loading') : t('plan.startTrial')}
          </button>
        </section>

        {/* Pro */}
        <section className="flex flex-col rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/20">
          <h2 className="font-bold">Pro</h2>
          <p className="mt-2 text-3xl font-bold">
            ฿{price}
            <span className="text-base font-medium text-indigo-100"> / {t('sub.month')}</span>
          </p>
          <p className="text-sm text-indigo-100">{t('pricing.prepaidNote')}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {[t('sub.unlimited'), t('pricing.featWeek'), t('pricing.featSync')].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckIcon width={16} height={16} className="mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-4 grid flex-1 grid-cols-4 content-end gap-1.5">
            {[1, 3, 6, 12].map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMonths(m)}
                aria-pressed={months === m}
                className={`rounded-xl py-2 text-xs font-semibold ${months === m ? 'bg-white text-indigo-700' : 'bg-white/15 text-white hover:bg-white/25'}`}
              >
                {t('pricing.months', { n: m })}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-indigo-100">{t('pricing.total', { price: fmt.number(price * months) })}</p>
          <button
            type="button"
            className="btn mt-3 w-full bg-white text-indigo-700 hover:bg-indigo-50"
            disabled={busy === 'pay' || (status === 'user' && !pricing.configured)}
            onClick={() => checkout()}
          >
            {busy === 'pay' ? t('common.loading') : t('pricing.payWithPromptPay')}
          </button>
          {status === 'user' && !pricing.configured && (
            <p className="mt-2 text-xs text-indigo-100">{t('errors.billing_not_configured')}</p>
          )}
        </section>
      </div>

      {needAuth && status !== 'user' && (
        <section className="card mx-auto mt-6 max-w-md p-5">
          <h2 className="mb-1 font-bold">{t('sub.loginToPay')}</h2>
          <p className="mb-4 text-sm text-slate-500">{t('auth.localNote')}</p>
          <AuthForm initialMode="login" onDone={() => checkout(true)} />
        </section>
      )}

      {status === 'offline' && (
        <p className="mt-6 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-800">{t('auth.offline')}</p>
      )}

      <section className="card mx-auto mt-8 max-w-lg p-5">
        <h2 className="section-title mb-3">{t('sub.compare')}</h2>
        <PlanCompare />
      </section>
    </PageShell>
  );
}
