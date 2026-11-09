import { useEffect, useState } from 'react';
import { errorKey } from '../lib/api.js';
import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';
import { Link } from '../lib/router.jsx';

const RESEND_COOLDOWN_S = 60;

/** "Check your inbox" panel with a resend button (60-second cooldown). */
export function CheckEmail({ email, next, onChangeEmail }) {
  const { t } = useI18n();
  const account = useAccount();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const resend = async () => {
    setMsg('');
    try {
      await account.resendVerification(email, next);
      setMsg(t('verify.resent'));
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setMsg(t(errorKey(err)));
    }
  };

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl" aria-hidden>
        📧
      </div>
      <div>
        <h2 className="text-lg font-bold">{t('verify.checkTitle')}</h2>
        <p className="mt-2 text-sm text-slate-600">{t('verify.checkDesc')}</p>
        <p className="mt-1 break-all font-semibold text-indigo-700">{email}</p>
      </div>
      <ol className="space-y-1 rounded-xl bg-slate-50 p-3 text-left text-sm text-slate-600">
        <li>1. {t('verify.step1')}</li>
        <li>2. {t('verify.step2')}</li>
        <li>3. {t('verify.step3')}</li>
      </ol>
      <p className="text-xs text-slate-500">{t('verify.spamHint')}</p>
      <button type="button" className="btn-soft w-full" disabled={cooldown > 0} onClick={resend}>
        {cooldown > 0 ? t('verify.resendIn', { n: cooldown }) : t('verify.resend')}
      </button>
      {msg && <p className="text-sm font-medium text-indigo-700">{msg}</p>}
      {onChangeEmail && (
        <button type="button" className="btn-ghost w-full text-sm" onClick={onChangeEmail}>
          {t('verify.useOtherEmail')}
        </button>
      )}
    </div>
  );
}

/**
 * Sign-up / log-in form.
 *  - Sign-up sends a confirmation email and shows <CheckEmail>; the user is logged in
 *    only after clicking the /verify/<token> link.
 *    (If the server has email confirmation off, sign-up logs in and calls `onDone(data, 'register')`.)
 *  - Log-in calls `onDone(data, 'login')`.
 *  - `next` is where the verify link sends the user afterwards (e.g. /trial/<token>).
 *  - `showTabs={false}` hides the sign-up/log-in switch (the /login and /signup pages link to each other instead).
 */
export default function AuthForm({ initialMode = 'register', onDone, submitLabel, next, showTabs = true }) {
  const { t, lang } = useI18n();
  const account = useAccount();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null); // { text, unverified }
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');

  useEffect(() => setMode(initialMode), [initialMode]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') {
        const data = await account.register({ ...form, lang, next });
        if (data.pendingVerification) setSentTo(data.email);
        else await onDone?.(data, 'register');
      } else {
        const data = await account.login(form.email, form.password);
        await onDone?.(data, 'login');
      }
    } catch (err) {
      setError({ text: t(errorKey(err)), unverified: err.code === 'email_not_verified', taken: err.code === 'email_taken' });
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return <CheckEmail email={sentTo} next={next} onChangeEmail={() => setSentTo('')} />;
  }

  const input = (key, type, autoComplete, extra = {}) => (
    <input
      id={`auth-${key}`}
      type={type}
      className="field"
      autoComplete={autoComplete}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      required={key !== 'name'}
      {...extra}
    />
  );

  return (
    <form onSubmit={submit} className="space-y-3">
      {showTabs && (
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        {['register', 'login'].map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold ${mode === m ? 'bg-white shadow-sm' : 'text-slate-500'}`}
          >
            {t(`auth.${m}`)}
          </button>
        ))}
      </div>
      )}
      {mode === 'register' && (
        <div>
          <label className="field-label" htmlFor="auth-name">
            {t('auth.name')} <span className="font-normal text-slate-400">{t('common.optional')}</span>
          </label>
          {input('name', 'text', 'nickname', { placeholder: t('auth.namePh'), maxLength: 40 })}
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="auth-email">{t('auth.email')}</label>
        {input('email', 'email', 'email', { inputMode: 'email' })}
      </div>
      <div>
        <label className="field-label" htmlFor="auth-password">{t('auth.password')}</label>
        {input('password', 'password', mode === 'register' ? 'new-password' : 'current-password', {
          minLength: mode === 'register' ? 8 : undefined,
        })}
        {mode === 'register' && <p className="mt-1 text-xs text-slate-500">{t('auth.passwordHint')}</p>}
      </div>
      {error && (
        <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error.text}
          {error.unverified && (
            <button
              type="button"
              className="mt-2 block font-bold underline"
              onClick={async () => {
                try {
                  await account.resendVerification(form.email, next);
                  setSentTo(form.email.trim().toLowerCase());
                } catch (err) {
                  setError({ text: t(errorKey(err)) });
                }
              }}
            >
              {t('verify.resendShort')}
            </button>
          )}
          {error.taken && !showTabs && (
            <Link to="/login" className="mt-2 block font-bold underline">
              {t('auth.goToLogin')}
            </Link>
          )}
        </div>
      )}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? t('common.loading') : submitLabel ? submitLabel(mode) : t(mode === 'register' ? 'auth.registerBtn' : 'auth.login')}
      </button>
      {mode === 'register' && account.pricing.emailVerification && (
        <p className="text-center text-xs text-slate-500">{t('verify.willSend')}</p>
      )}
    </form>
  );
}
