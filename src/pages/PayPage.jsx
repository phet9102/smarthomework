import { useEffect, useRef, useState } from 'react';
import PageShell, { PageMessage } from './PageShell.jsx';
import AuthForm from '../components/AuthForm.jsx';
import QrCode, { downloadQrPng } from '../components/QrCode.jsx';
import { api, errorKey } from '../lib/api.js';
import { navigate, Link } from '../lib/router.jsx';
import { useCountdown, formatCountdown } from '../hooks/useCountdown.js';
import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';

/**
 * /pay/<token>: full-page Thai QR Payment (PromptPay) for one checkout.
 * The amount is locked inside the QR and unique to this payment (e.g. 49.63).
 */
export default function PayPage({ token }) {
  const { t, fmt } = useI18n();
  const account = useAccount();
  const [payment, setPayment] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const qrRef = useRef(null);
  const payable = payment?.status === 'awaiting' || payment?.status === 'expired';
  const msLeft = useCountdown(payable ? payment.expiresAt : null);
  const graceLeft = useCountdown(payable ? payment.notifyUntil : null);

  useEffect(() => {
    if (account.status !== 'user') return;
    api(`/billing/payments/${token}`)
      .then((r) => {
        // Already reported / finished → the receipt page is the right place.
        const stillPayable = r.payment.status === 'awaiting' || (r.payment.status === 'expired' && Date.now() < r.payment.notifyUntil);
        if (!stillPayable) navigate(`/receipt/${token}`, { replace: true });
        else setPayment(r.payment);
      })
      .catch((err) => setLoadError(err.code));
  }, [token, account.status]);

  const notify = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api(`/billing/payments/${token}/notify`, { method: 'POST', body: { note } });
      account.setOpenPayment(r.payment);
      navigate(`/receipt/${token}`);
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await api(`/billing/payments/${token}/cancel`, { method: 'POST' });
      account.setOpenPayment(null);
      navigate('/subscription', { replace: true });
    } catch (err) {
      setError(t(errorKey(err)));
      setBusy(false);
    }
  };

  if (account.status === 'loading') return <PageShell><p className="py-16 text-center text-slate-500">{t('common.loading')}</p></PageShell>;

  if (account.status !== 'user') {
    return (
      <PageShell>
        <section className="card p-5">
          <h1 className="mb-1 text-lg font-bold">{t('payPage.loginTitle')}</h1>
          <p className="mb-4 text-sm text-slate-500">{t('payPage.loginDesc')}</p>
          <AuthForm initialMode="login" />
        </section>
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell>
        <PageMessage emoji="🔍" title={t('payPage.notFoundTitle')} desc={t('payPage.notFoundDesc')}>
          <Link to="/subscription" className="btn-primary">{t('trialPage.backToPlans')}</Link>
        </PageMessage>
      </PageShell>
    );
  }

  if (!payment) return <PageShell><p className="py-16 text-center text-slate-500">{t('common.loading')}</p></PageShell>;

  const amountText = fmt.money(payment.amount);
  const expired = msLeft === 0;
  const canNotify = !expired || graceLeft > 0;

  return (
    <PageShell>
      <div className="space-y-4">
        <h1 className="text-center text-xl font-bold">{t('checkout.title')}</h1>

        {/* Thai QR Payment style card */}
        <section className="mx-auto max-w-sm overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
          <div className="bg-[#0e3c6e] px-4 py-3 text-center text-white">
            <p className="text-sm font-bold tracking-[0.2em]">THAI QR PAYMENT</p>
          </div>
          <div className="flex justify-center pt-3">
            <span className="rounded-md border-2 border-[#0e3c6e] px-3 py-0.5 text-sm font-bold text-[#0e3c6e]">PromptPay</span>
          </div>
          <div className={`flex justify-center p-4 ${expired ? 'opacity-20 blur-sm' : ''}`}>
            {payment.payload && <QrCode ref={qrRef} value={payment.payload} size={248} label={t('checkout.scan')} />}
          </div>
          <div className="border-t border-dashed border-slate-200 px-5 py-4 text-center">
            <p className="text-xs text-slate-500">{t('checkout.amount')}</p>
            <p className="text-4xl font-bold tabular-nums text-[#0e3c6e]">฿{amountText}</p>
            <p className="mt-2 font-semibold">{payment.receiverName || '—'}</p>
            <p className="text-xs tabular-nums text-slate-500">PromptPay {payment.receiverMasked}</p>
            <p className="mt-2 text-xs text-slate-500">
              {t('checkout.ref')} <span className="font-mono font-semibold text-slate-700">{payment.ref}</span> · {t('pricing.months', { n: payment.months })}
            </p>
          </div>
          <div className={`px-5 py-2 text-center text-sm font-semibold ${expired ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>
            {expired ? t('payPage.expired') : t('payPage.timeLeft', { time: formatCountdown(msLeft) })}
          </div>
        </section>

        {expired && canNotify && (
          <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900">
            {t('payPage.graceNote', { time: formatCountdown(graceLeft) })}
          </p>
        )}

        {!expired && (
          <>
            <button
              type="button"
              className="btn-soft mx-auto flex"
              onClick={() =>
                downloadQrPng(qrRef.current, {
                  filename: `promptpay-${amountText}-${payment.ref}.png`,
                  title: `฿${amountText}`,
                  subtitle: `${payment.receiverName || ''} · ${t('checkout.ref')} ${payment.ref}`,
                })
              }
            >
              {t('checkout.saveQr')}
            </button>

            <p className="rounded-xl bg-indigo-50 p-3 text-center text-sm text-indigo-800">{t('checkout.exactNote')}</p>

            <ol className="card space-y-1.5 p-4 text-sm text-slate-600">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{n}</span>
                  {t(`payPage.step${n}`)}
                </li>
              ))}
            </ol>
          </>
        )}

        {canNotify && (
            <section className="card space-y-3 p-4">
              <div>
                <label className="field-label" htmlFor="pay-note">
                  {t('checkout.notifyLabel')} <span className="font-normal text-slate-400">{t('common.optional')}</span>
                </label>
                <input
                  id="pay-note"
                  className="field"
                  value={note}
                  maxLength={200}
                  placeholder={t('checkout.notifyPh')}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
              <button type="button" className="btn-primary w-full py-3 text-base" disabled={busy} onClick={notify}>
                {t('checkout.notify')}
              </button>
            </section>
        )}

        <div className="flex justify-center gap-2">
          {expired ? (
            <Link to="/subscription" className={canNotify ? 'btn-soft' : 'btn-primary'}>{t('payPage.newPayment')}</Link>
          ) : (
            <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={cancel}>
              {t('checkout.cancelPayment')}
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
