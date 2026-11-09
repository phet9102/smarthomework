import { useCallback, useEffect, useState } from 'react';
import PageShell, { PageMessage } from './PageShell.jsx';
import AuthForm from '../components/AuthForm.jsx';
import { PaymentStatusChip } from '../components/AccountSheet.jsx';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';
import { CheckIcon } from '../components/Icons.jsx';

const POLL_MS = 15_000;

/**
 * /receipt/<token>: shown after "I've paid". Updates itself while waiting for the
 * admin to confirm the transfer, then shows the receipt and new Pro end date.
 */
export default function ReceiptPage({ token }) {
  const { t, fmt } = useI18n();
  const account = useAccount();
  const [data, setData] = useState(null); // { payment, plan }
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api(`/billing/payments/${token}`);
      setData(r);
      return r;
    } catch {
      setMissing(true);
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (account.status !== 'user') return undefined;
    load();
    return undefined;
  }, [account.status, load]);

  const status = data?.payment.status;
  useEffect(() => {
    if (status !== 'submitted') return undefined;
    const id = window.setInterval(async () => {
      const r = await load();
      if (r && r.payment.status !== 'submitted') account.refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [status, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (account.status === 'loading') return <PageShell><p className="py-16 text-center text-slate-500">{t('common.loading')}</p></PageShell>;

  if (account.status !== 'user') {
    return (
      <PageShell>
        <section className="card p-5">
          <h1 className="mb-1 text-lg font-bold">{t('payPage.loginTitle')}</h1>
          <p className="mb-4 text-sm text-slate-500">{t('receipt.loginDesc')}</p>
          <AuthForm initialMode="login" next={`/receipt/${token}`} />
        </section>
      </PageShell>
    );
  }

  if (missing) {
    return (
      <PageShell>
        <PageMessage emoji="🔍" title={t('payPage.notFoundTitle')} desc={t('payPage.notFoundDesc')}>
          <Link to="/subscription" className="btn-primary">{t('trialPage.backToPlans')}</Link>
        </PageMessage>
      </PageShell>
    );
  }

  if (!data) return <PageShell><p className="py-16 text-center text-slate-500">{t('common.loading')}</p></PageShell>;

  const { payment, plan } = data;
  const steps = [
    { key: 'created', done: true, time: payment.createdAt },
    { key: 'reported', done: Boolean(payment.submittedAt), time: payment.submittedAt },
    { key: 'confirmed', done: payment.status === 'approved', time: payment.reviewedAt },
  ];
  const dateTime = (ts) => fmt.date(ts, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const hero = {
    submitted: { emoji: '⏳', title: t('receipt.pendingTitle'), desc: t('receipt.pendingDesc'), tone: 'from-sky-500 to-indigo-600' },
    approved: {
      emoji: '✅',
      title: t('receipt.approvedTitle'),
      desc: plan?.paidUntil ? t('receipt.approvedDesc', { date: fmt.date(plan.paidUntil) }) : '',
      tone: 'from-emerald-500 to-teal-600',
    },
    awaiting: { emoji: '📱', title: t('receipt.awaitingTitle'), desc: t('receipt.awaitingDesc'), tone: 'from-amber-500 to-orange-500' },
    rejected: { emoji: '⚠️', title: t('receipt.rejectedTitle'), desc: t('receipt.rejectedDesc'), tone: 'from-rose-500 to-rose-600' },
    expired: { emoji: '⌛', title: t('receipt.expiredTitle'), desc: t('receipt.expiredDesc'), tone: 'from-slate-500 to-slate-600' },
    cancelled: { emoji: '✖️', title: t('payStatus.cancelled'), desc: '', tone: 'from-slate-500 to-slate-600' },
  }[payment.status];

  return (
    <PageShell>
      <div className="space-y-4">
        <section className={`rounded-3xl bg-gradient-to-br ${hero.tone} p-6 text-center text-white shadow-lg`}>
          <p className="text-5xl" aria-hidden>{hero.emoji}</p>
          <h1 className="mt-3 text-2xl font-bold">{hero.title}</h1>
          {hero.desc && <p className="mx-auto mt-2 max-w-sm text-sm text-white/90">{hero.desc}</p>}
          {payment.status === 'submitted' && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {t('receipt.autoUpdate')}
            </p>
          )}
        </section>

        <section className="card p-5">
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.key} className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    s.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {s.done ? <CheckIcon width={14} height={14} strokeWidth={3} /> : i + 1}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${s.done ? '' : 'text-slate-400'}`}>{t(`receipt.step.${s.key}`)}</p>
                  {s.time && <p className="text-xs text-slate-500">{dateTime(s.time)}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">{t('receipt.details')}</h2>
            <PaymentStatusChip status={payment.status} />
          </div>
          <dl className="divide-y divide-slate-100 text-sm">
            {[
              [t('checkout.ref'), <span key="r" className="font-mono font-semibold">{payment.ref}</span>],
              [t('checkout.amount'), <span key="a" className="font-semibold tabular-nums">฿{fmt.money(payment.amount)}</span>],
              [t('receipt.package'), `Pro · ${t('pricing.months', { n: payment.months })}`],
              [t('checkout.to'), `${payment.receiverName || '—'} (${payment.receiverMasked})`],
              [t('receipt.created'), dateTime(payment.createdAt)],
              payment.note ? [t('admin.note'), payment.note] : null,
              payment.status === 'approved' && plan?.paidUntil ? [t('auth.validUntil'), fmt.date(plan.paidUntil)] : null,
            ]
              .filter(Boolean)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
          </dl>
        </section>

        <div className="flex flex-col gap-2">
          {(payment.status === 'awaiting' || (payment.status === 'expired' && Date.now() < payment.notifyUntil)) && (
            <Link to={`/pay/${payment.id}`} className="btn-primary">
              {payment.status === 'expired' ? t('receipt.reportLate') : t('receipt.backToQr')}
            </Link>
          )}
          {['rejected', 'expired', 'cancelled'].includes(payment.status) && (
            <Link to="/subscription" className="btn-primary">{t('payPage.newPayment')}</Link>
          )}
          <Link to="/" className={payment.status === 'approved' ? 'btn-primary' : 'btn-soft'}>{t('trialPage.goToApp')}</Link>
        </div>
      </div>
    </PageShell>
  );
}
