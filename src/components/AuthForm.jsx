import { useEffect, useState } from 'react';
import { errorKey } from '../lib/api.js';
import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';

/**
 * Sign-up / log-in form. `onDone(data, mode)` runs after success.
 * `submitLabel` lets a page change the button text (e.g. "Sign up & start trial").
 */
export default function AuthForm({ initialMode = 'register', onDone, submitLabel }) {
  const { t, lang } = useI18n();
  const account = useAccount();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setMode(initialMode), [initialMode]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data =
        mode === 'register'
          ? await account.register({ ...form, lang })
          : await account.login(form.email, form.password);
      await onDone?.(data, mode);
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

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
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        {['register', 'login'].map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-semibold ${mode === m ? 'bg-white shadow-sm' : 'text-slate-500'}`}
          >
            {t(`auth.${m}`)}
          </button>
        ))}
      </div>
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
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? t('common.loading') : submitLabel ? submitLabel(mode) : t(mode === 'register' ? 'auth.registerBtn' : 'auth.login')}
      </button>
    </form>
  );
}
