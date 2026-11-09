import { useEffect, useState } from 'react';
import Sheet from './Sheet.jsx';
import { api } from '../lib/api.js';
import { navigate } from '../lib/router.jsx';
import AuthForm from './AuthForm.jsx';
import { FREE_TASK_LIMIT } from '../lib/constants.js';
import { useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';
import { CheckIcon, XIcon } from './Icons.jsx';

const STATUS_CHIP = {
  awaiting: 'bg-amber-100 text-amber-800',
  submitted: 'bg-sky-100 text-sky-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  expired: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
};

export function PaymentStatusChip({ status }) {
  const { t } = useI18n();
  return <span className={`chip ${STATUS_CHIP[status] || STATUS_CHIP.expired}`}>{t(`payStatus.${status}`)}</span>;
}

/** Free vs Pro comparison table. */
export function PlanCompare() {
  const { t } = useI18n();
  const rows = [
    [t('pricing.featPriority'), true, true],
    [t('pricing.featTasks'), t('pricing.featTasksFree', { n: FREE_TASK_LIMIT }), t('pricing.featTasksPro')],
    [t('pricing.featWeek'), false, true],
    [t('pricing.featSync'), false, true],
  ];
  const cell = (v) =>
    v === true ? (
      <CheckIcon width={18} height={18} className="mx-auto text-emerald-600" />
    ) : v === false ? (
      <XIcon width={16} height={16} className="mx-auto text-slate-300" />
    ) : (
      <span className="text-xs font-semibold">{v}</span>
    );
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500">
          <th className="pb-2 text-left font-medium" />
          <th className="w-20 pb-2 font-semibold">{t('pricing.free')}</th>
          <th className="w-20 pb-2 font-semibold text-indigo-700">{t('pricing.pro')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(([label, free, pro]) => (
          <tr key={label}>
            <td className="py-2 pr-2 text-slate-700">{label}</td>
            <td className="py-2 text-center text-slate-600">{cell(free)}</td>
            <td className="py-2 text-center text-indigo-700">{cell(pro)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Account hub: sign up / log in, plan status, upgrade, history, admin entry. */
export default function AccountSheet({ open, initialMode = 'register', onClose, onAdmin, onToast }) {
  const { t, fmt } = useI18n();
  const account = useAccount();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!open || account.status !== 'user') return;
    account.refresh();
    api('/billing/payments')
      .then((r) => setHistory(r.payments))
      .catch(() => setHistory([]));
  }, [open, account.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const { plan, user, pricing } = account;
  const price = pricing.priceThb;
  const go = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <Sheet open={open} title={account.status === 'user' ? t('auth.myPlan') : t('pricing.title')} onClose={onClose} autoFocus={false}>
      {account.status === 'loading' && <p className="py-8 text-center text-slate-500">{t('common.loading')}</p>}

      {account.status === 'offline' && (
        <div className="space-y-4">
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t('auth.offline')}</p>
          <PlanCompare />
          <button type="button" className="btn-soft w-full" onClick={account.refresh}>{t('common.retry')}</button>
        </div>
      )}

      {account.status === 'guest' && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
            <p className="text-sm font-semibold text-indigo-100">{t('pricing.title')}</p>
            <p className="mt-1 text-2xl font-bold">{t('pricing.perMonth', { price })}</p>
            <p className="mt-1 text-sm text-indigo-100">{t('pricing.trialNote', { n: pricing.trialDays })}</p>
          </div>
          <PlanCompare />
          <AuthForm
            initialMode={initialMode}
            onDone={(data, mode) => {
              onToast(t(mode === 'register' ? 'auth.welcome' : 'auth.welcomeBack', { name: data.user.name }));
              onClose();
            }}
          />
          <button type="button" className="btn-ghost w-full" onClick={() => go('/subscription')}>
            {t('sub.seePlans')}
          </button>
        </div>
      )}

      {account.status === 'user' && plan && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`chip ${
                  plan.status === 'active'
                    ? 'bg-indigo-600 text-white'
                    : plan.status === 'trial'
                      ? 'bg-emerald-100 text-emerald-700'
                      : plan.status === 'free'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-rose-100 text-rose-700'
                }`}
              >
                {plan.status === 'active'
                  ? t('plan.activeShort')
                  : plan.status === 'trial'
                    ? t('plan.trial', { n: plan.daysLeft })
                    : plan.status === 'free'
                      ? t('plan.guest')
                      : t('plan.expired')}
              </span>
              {(plan.status === 'trial' || plan.status === 'active') && plan.endsAt && (
                <span className="text-slate-600">
                  {plan.status === 'trial' ? t('auth.trialUntil') : t('auth.validUntil')} {fmt.date(plan.endsAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {account.openPayment && (
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  go(account.openPayment.status === 'submitted' ? `/receipt/${account.openPayment.id}` : `/pay/${account.openPayment.id}`)
                }
              >
                {t('sub.openPayment', { amount: fmt.money(account.openPayment.amount), status: t(`payStatus.${account.openPayment.status}`) })}
              </button>
            )}
            <button type="button" className={account.openPayment ? 'btn-soft' : 'btn-primary'} onClick={() => go('/subscription')}>
              {plan.status === 'active' ? t('plan.renew') : plan.status === 'trial' ? t('plan.upgrade') : t('sub.seePlans')}
            </button>
          </div>

          <PlanCompare />

          <section>
            <h3 className="section-title mb-2">{t('auth.history')}</h3>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400">{t('auth.noHistory')}</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {history.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => go(p.status === 'awaiting' ? `/pay/${p.id}` : `/receipt/${p.id}`)}
                      className="flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-slate-50"
                    >
                    <span>
                      <span className="font-semibold tabular-nums">฿{fmt.money(p.amount)}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {t('pricing.months', { n: p.months })} · {fmt.date(p.createdAt, { day: 'numeric', month: 'short' })}
                      </span>
                    </span>
                    <PaymentStatusChip status={p.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-2">
            {user.isAdmin && (
              <button type="button" className="btn-soft" onClick={onAdmin}>{t('auth.admin')}</button>
            )}
            <button
              type="button"
              className="btn-ghost text-rose-600"
              onClick={async () => {
                await account.logout();
                onToast(t('auth.loggedOut'));
                onClose();
                navigate('/login', { replace: true });
              }}
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
