import { useCallback, useEffect, useState } from 'react';
import Sheet from './Sheet.jsx';
import { PaymentStatusChip } from './AccountSheet.jsx';
import { api, errorKey } from '../lib/api.js';
import { useI18n } from '../i18n/index.jsx';

/** Admin: match transfers seen in K PLUS (exact amount incl. satang) and approve/reject. */
export default function AdminSheet({ open, onClose, onToast }) {
  const { t, fmt } = useI18n();
  const [scope, setScope] = useState('open');
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await api(`/admin/payments?status=${scope}`);
      setItems(r.payments);
    } catch (err) {
      setError(t(errorKey(err)));
    }
  }, [scope, t]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const review = async (p, action) => {
    const question =
      action === 'approve'
        ? t('admin.confirmApprove', { amount: fmt.money(p.amount), email: p.user.email })
        : t('admin.confirmReject');
    if (!window.confirm(question)) return;
    setBusyId(p.id);
    try {
      await api(`/admin/payments/${p.id}/${action}`, { method: 'POST' });
      onToast(action === 'approve' ? t('admin.approved') : t('admin.rejected'));
      await load();
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet open={open} title={t('admin.title')} onClose={onClose} autoFocus={false}>
      <p className="mb-3 text-sm text-slate-500">{t('admin.desc')}</p>
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {['open', 'all'].map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${scope === s ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            >
              {t(`admin.${s}`)}
            </button>
          ))}
        </div>
        <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={load}>{t('common.retry')}</button>
      </div>
      {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('admin.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => {
            const canReview = p.status === 'awaiting' || p.status === 'submitted';
            return (
              <li key={p.id} className="rounded-2xl p-3 ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">฿{fmt.money(p.amount)}</p>
                    <p className="text-sm font-medium">{p.user.name} · <span className="text-slate-500">{p.user.email}</span></p>
                    <p className="text-xs text-slate-500">
                      {p.ref} · {t('pricing.months', { n: p.months })} ·{' '}
                      {fmt.date(p.submittedAt || p.createdAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <PaymentStatusChip status={p.status} />
                </div>
                {p.note && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-sm">
                    <span className="text-xs text-slate-500">{t('admin.note')}: </span>
                    {p.note}
                  </p>
                )}
                {(canReview || p.status === 'expired') && (
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn-primary flex-1 py-2" disabled={busyId === p.id} onClick={() => review(p, 'approve')}>
                      {t('admin.approve')}
                    </button>
                    {canReview && (
                      <button type="button" className="btn-soft flex-1 py-2" disabled={busyId === p.id} onClick={() => review(p, 'reject')}>
                        {t('admin.reject')}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
