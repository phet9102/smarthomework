import { useEffect, useRef, useState } from 'react';
import PageShell, { PageMessage } from './PageShell.jsx';
import { CheckEmail } from '../components/AuthForm.jsx';
import { errorKey } from '../lib/api.js';
import { Link, navigate } from '../lib/router.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';

/** /verify/<token>: the link from the sign-up email. Confirms the address and logs in. */
export default function VerifyPage({ token }) {
  const { t } = useI18n();
  const account = useAccount();
  const [state, setState] = useState({ status: 'working' }); // working | done | error
  const [email, setEmail] = useState('');
  const [resentTo, setResentTo] = useState('');
  const started = useRef(false);

  useEffect(() => {
    // The link works once; never call it twice (React StrictMode runs effects twice in dev).
    if (started.current) return;
    started.current = true;
    account
      .verifyEmail(token)
      .then((data) => {
        setState({ status: 'done', name: data.user.name, next: data.next || '/' });
        window.setTimeout(() => navigate(data.next || '/', { replace: true }), 2500);
      })
      .catch((err) => setState({ status: 'error', code: err.code }));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status === 'working') {
    return (
      <PageShell>
        <PageMessage emoji="⏳" title={t('verify.working')} />
      </PageShell>
    );
  }

  if (state.status === 'done') {
    return (
      <PageShell>
        <PageMessage emoji="✅" title={t('verify.doneTitle', { name: state.name })} desc={t('verify.doneDesc')}>
          <Link to={state.next} className="btn-primary">{t('verify.continue')}</Link>
        </PageMessage>
      </PageShell>
    );
  }

  // Link used/expired/invalid. If this person is already logged in, there is nothing to fix.
  if (account.status === 'user') {
    return (
      <PageShell>
        <PageMessage emoji="✅" title={t('verify.alreadyTitle')} desc={t('verify.alreadyDesc')}>
          <Link to="/" className="btn-primary">{t('trialPage.goToApp')}</Link>
        </PageMessage>
      </PageShell>
    );
  }

  if (resentTo) {
    return (
      <PageShell>
        <section className="card p-5">
          <CheckEmail email={resentTo} />
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageMessage
        emoji={state.code === 'link_expired' ? '⌛' : '🔗'}
        title={t(`verify.err.${['link_expired', 'link_used', 'link_invalid'].includes(state.code) ? state.code : 'other'}`)}
        desc={state.code === 'link_used' ? t('verify.usedDesc') : t('verify.badDesc')}
      >
        {state.code === 'link_used' ? (
          <Link to="/login" className="btn-primary">{t('auth.login')}</Link>
        ) : (
          <form
            className="flex w-full max-w-xs flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await account.resendVerification(email);
                setResentTo(email.trim().toLowerCase());
              } catch (err) {
                setState({ status: 'error', code: err.code, msg: t(errorKey(err)) });
              }
            }}
          >
            <input
              type="email"
              required
              className="field"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="btn-primary">{t('verify.resend')}</button>
            {state.msg && <p className="text-sm text-rose-700">{state.msg}</p>}
          </form>
        )}
      </PageMessage>
    </PageShell>
  );
}
