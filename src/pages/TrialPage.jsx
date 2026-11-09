import { useEffect, useState } from 'react';
import PageShell, { PageMessage } from './PageShell.jsx';
import AuthForm from '../components/AuthForm.jsx';
import { api, errorKey } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { useCountdown, formatCountdown } from '../hooks/useCountdown.js';
import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';
import { CheckIcon } from '../components/Icons.jsx';

/** /trial/<token>: confirm the free trial (sign up / log in right here if needed). */
export default function TrialPage({ token }) {
  const { t, fmt } = useI18n();
  const account = useAccount();
  const [link, setLink] = useState(null); // { status, usedByMe, expiresAt, trialDays }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const msLeft = useCountdown(link?.status === 'valid' ? link.expiresAt : null);

  useEffect(() => {
    let cancelled = false;
    api(`/trial/links/${token}`)
      .then((r) => !cancelled && setLink(r))
      .catch((err) => !cancelled && setLink({ status: err.code === 'link_invalid' ? 'invalid' : 'error', code: err.code }));
    return () => {
      cancelled = true;
    };
  }, [token, account.user?.id]);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/trial/links/${token}/confirm`, { method: 'POST' });
      await account.refresh();
      setStarted(true);
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const plan = account.plan;
  const expiredNow = link?.status === 'valid' && msLeft === 0;

  let body;
  if (!link) {
    body = <p className="py-16 text-center text-slate-500">{t('common.loading')}</p>;
  } else if (started || (link.status === 'used' && link.usedByMe)) {
    body = (
      <PageMessage
        emoji="🎉"
        title={t('trialPage.startedTitle')}
        desc={plan?.endsAt ? t('trialPage.startedDesc', { date: fmt.date(plan.endsAt) }) : undefined}
      >
        <Link to="/" className="btn-primary">{t('trialPage.goToApp')}</Link>
      </PageMessage>
    );
  } else if (link.status === 'invalid' || link.status === 'error') {
    body = (
      <PageMessage emoji="🔗" title={t('trialPage.invalidTitle')} desc={t(link.status === 'error' ? errorKey(link) : 'trialPage.invalidDesc')}>
        <Link to="/subscription" className="btn-primary">{t('trialPage.backToPlans')}</Link>
      </PageMessage>
    );
  } else if (link.status === 'used' || link.status === 'expired' || expiredNow) {
    body = (
      <PageMessage emoji="⌛" title={t('trialPage.expiredTitle')} desc={t('trialPage.expiredDesc')}>
        <Link to="/subscription" className="btn-primary">{t('trialPage.newLink')}</Link>
      </PageMessage>
    );
  } else {
    body = (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg shadow-emerald-600/20">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-100">{t('trialPage.kicker')}</p>
          <h1 className="mt-1 text-2xl font-bold">{t('trialPage.title', { n: link.trialDays })}</h1>
          <ul className="mt-4 space-y-2 text-sm">
            {[t('sub.unlimited'), t('pricing.featWeek'), t('pricing.featSync'), t('sub.noCard')].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckIcon width={16} height={16} /> {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-white/15 px-3 py-2 text-sm">{t('trialPage.afterTrial')}</p>
        </section>

        <section className="card p-5">
          {account.status === 'user' && !plan?.trialAvailable ? (
            <div className="text-center">
              <p className="font-semibold">{t('errors.trial_used')}</p>
              <Link to="/subscription" className="btn-primary mt-4">{t('trialPage.backToPlans')}</Link>
            </div>
          ) : account.status === 'user' ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-500">{t('trialPage.signedInAs', { email: account.user.email })}</p>
              <button type="button" className="btn-primary w-full py-3 text-base" disabled={busy} onClick={confirm}>
                {busy ? t('common.loading') : t('trialPage.confirm', { n: link.trialDays })}
              </button>
            </div>
          ) : (
            <>
              <h2 className="mb-3 font-bold">{t('trialPage.authTitle')}</h2>
              <AuthForm
                initialMode="register"
                next={`/trial/${token}`}
                submitLabel={(mode) => (mode === 'register' ? t('auth.registerBtn') : t('trialPage.loginAndStart'))}
                onDone={confirm}
              />
            </>
          )}
          {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
        </section>

        <p className="text-center text-xs text-slate-500">{t('trialPage.linkExpires', { time: formatCountdown(msLeft) })}</p>
      </div>
    );
  }

  return <PageShell>{body}</PageShell>;
}
