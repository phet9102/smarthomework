import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';
import { navigate } from '../lib/router.jsx';

/** One slim banner that tells the student where they stand: guest, trial, expiring, expired, or pending payment. */
export default function PlanBanner() {
  const { t } = useI18n();
  const { status, plan, openPayment, pricing } = useAccount();

  let tone = '';
  let text = '';
  let cta = '';
  let to = '/subscription';

  if (status === 'guest') {
    tone = 'bg-indigo-50 text-indigo-800 ring-indigo-100';
    text = t('plan.guestBanner', { n: pricing.trialDays });
    cta = t('plan.startTrial');
  } else if (status === 'user' && plan) {
    if (openPayment?.status === 'submitted') {
      tone = 'bg-sky-50 text-sky-800 ring-sky-100';
      text = t('plan.pendingBanner');
      cta = t('plan.viewStatus');
      to = `/receipt/${openPayment.id}`;
    } else if (plan.status === 'free') {
      tone = 'bg-indigo-50 text-indigo-800 ring-indigo-100';
      text = t('plan.freeBanner', { n: pricing.trialDays });
      cta = t('plan.startTrial');
    } else if (plan.status === 'expired') {
      tone = 'bg-rose-50 text-rose-800 ring-rose-100';
      text = t('plan.expiredBanner');
      cta = t('plan.renew');
    } else if (plan.status === 'trial') {
      tone = plan.daysLeft <= 3 ? 'bg-amber-50 text-amber-900 ring-amber-100' : 'bg-emerald-50 text-emerald-800 ring-emerald-100';
      text = t('plan.trialBanner', { n: plan.daysLeft });
      cta = t('plan.upgrade');
    } else if (plan.status === 'active' && plan.daysLeft <= 5) {
      tone = 'bg-amber-50 text-amber-900 ring-amber-100';
      text = t('plan.expiringBanner', { n: plan.daysLeft });
      cta = t('plan.renew');
    }
  }

  if (!text) return null;

  return (
    <div className={`mb-4 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm ring-1 ${tone}`}>
      <p className="flex-1">{text}</p>
      {cta && (
        <button type="button" onClick={() => navigate(to)} className="shrink-0 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-bold shadow-sm hover:bg-white">
          {cta}
        </button>
      )}
    </div>
  );
}

/** Shown in place of a Pro-only view. */
export function ProLock({ title, desc }) {
  const { t } = useI18n();
  const { status } = useAccount();
  return (
    <section className="card px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl" aria-hidden>
        🔒
      </div>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{desc}</p>
      <button type="button" className="btn-primary mt-5" onClick={() => navigate('/subscription')}>
        {status === 'guest' ? t('plan.startTrial') : t('plan.upgrade')}
      </button>
    </section>
  );
}
