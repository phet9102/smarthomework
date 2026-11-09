import { useEffect, useRef, useState } from 'react';
import Sheet from './Sheet.jsx';
import { DEFAULT_SETTINGS } from '../lib/constants.js';
import { reviveSettings, reviveTasks } from '../lib/storage.js';
import { api, errorKey } from '../lib/api.js';
import { LANGUAGES, useI18n } from '../i18n/index.jsx';
import { useAccount } from '../account/AccountProvider.jsx';

/** Language, free-time, focus-block, data and cloud-sync settings. */
export default function SettingsPanel({ open, settings, tasks, onSave, onImport, onReset, onClose, onOpenAccount }) {
  const { t, fmt, lang, setLang } = useI18n();
  const account = useAccount();
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState('');
  const [cloudMsg, setCloudMsg] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setMessage('');
      setCloudMsg('');
    }
  }, [open, settings]);

  const weekdays = fmt.weekdayNames();
  const setDay = (i, value) =>
    setDraft((d) => ({ ...d, dailyMinutes: d.dailyMinutes.map((m, j) => (j === i ? value : m)) }));

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks, settings }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homework-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file) => {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.tasks)) throw new Error('No tasks');
      const imported = reviveTasks(data.tasks);
      onImport(imported, data.settings ? reviveSettings(data.settings) : null);
      setMessage(t('settings.imported', { n: imported.length }));
    } catch {
      setMessage(t('settings.invalidFile'));
    }
  };

  const cloudUpload = async () => {
    setCloudBusy(true);
    setCloudMsg('');
    try {
      const res = await api('/sync', { method: 'PUT', body: { data: { tasks, settings } } });
      setCloudMsg(`${t('settings.cloudUploaded')} · ${t('settings.cloudLast', { date: fmt.date(res.updatedAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) })}`);
    } catch (err) {
      setCloudMsg(t(errorKey(err)));
    } finally {
      setCloudBusy(false);
    }
  };

  const cloudDownload = async () => {
    setCloudBusy(true);
    setCloudMsg('');
    try {
      const res = await api('/sync');
      if (!res.data) {
        setCloudMsg(t('settings.cloudEmpty'));
      } else if (window.confirm(t('settings.cloudConfirm'))) {
        const imported = reviveTasks(res.data.tasks);
        onImport(imported, res.data.settings ? reviveSettings(res.data.settings) : null);
        setCloudMsg(t('settings.cloudDownloaded', { n: imported.length }));
      }
    } catch (err) {
      setCloudMsg(t(errorKey(err)));
    } finally {
      setCloudBusy(false);
    }
  };

  const weeklyTotal = draft.dailyMinutes.reduce((s, m) => s + Math.min(Number(m) || 0, draft.maxDailyMinutes), 0);
  const canSync = account.status === 'user' && account.isPro;

  return (
    <Sheet
      open={open}
      title={t('settings.title')}
      onClose={onClose}
      autoFocus={false}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn-primary flex-[2]" onClick={() => onSave(reviveSettings(draft))}>
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 font-semibold">{t('settings.language')}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LANGUAGES).map(([code, info]) => (
              <button
                type="button"
                key={code}
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition ${
                  lang === code ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {info.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-semibold">{t('settings.freeTime')}</h3>
          <p className="mb-3 text-sm text-slate-500">
            {t('settings.freeTimeDesc', { time: fmt.duration(weeklyTotal) })}
          </p>
          <div className="space-y-2.5">
            {weekdays.map((name, i) => (
              <div key={name + i} className="flex items-center gap-3">
                <span className="w-12 text-sm font-medium text-slate-600">{name}</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={draft.dailyMinutes[i]}
                  onChange={(e) => setDay(i, Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                  aria-label={t('settings.freeMinutesOn', { day: name })}
                />
                <span className="w-24 text-right text-sm font-semibold tabular-nums">
                  {draft.dailyMinutes[i] === 0 ? t('settings.off') : fmt.duration(draft.dailyMinutes[i])}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="field-label" htmlFor="maxDaily">{t('settings.maxDaily')}</label>
            <div className="flex items-center gap-3">
              <input
                id="maxDaily"
                type="range"
                min={30}
                max={480}
                step={15}
                value={draft.maxDailyMinutes}
                onChange={(e) => setDraft((d) => ({ ...d, maxDailyMinutes: Number(e.target.value) }))}
                className="flex-1 accent-indigo-600"
              />
              <span className="w-24 text-right text-sm font-semibold tabular-nums">{fmt.duration(draft.maxDailyMinutes)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t('settings.maxDailyHint')}</p>
          </div>
          <div>
            <label className="field-label" htmlFor="block">{t('settings.block')}</label>
            <select
              id="block"
              className="field"
              value={draft.blockMinutes}
              onChange={(e) => setDraft((d) => ({ ...d, blockMinutes: Number(e.target.value) }))}
            >
              {[25, 30, 45, 50, 60, 90].map((m) => (
                <option key={m} value={m}>{t('settings.minutes', { n: m })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="break">{t('settings.break')}</label>
            <select
              id="break"
              className="field"
              value={draft.breakMinutes}
              onChange={(e) => setDraft((d) => ({ ...d, breakMinutes: Number(e.target.value) }))}
            >
              {[0, 5, 10, 15, 20].map((m) => (
                <option key={m} value={m}>{m === 0 ? t('settings.none') : t('settings.minutes', { n: m })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="start">{t('settings.studyStart')}</label>
            <input
              id="start"
              type="time"
              className="field"
              value={draft.studyStart}
              onChange={(e) => setDraft((d) => ({ ...d, studyStart: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="days">{t('settings.planAhead')}</label>
            <select
              id="days"
              className="field"
              value={draft.planDays}
              onChange={(e) => setDraft((d) => ({ ...d, planDays: Number(e.target.value) }))}
            >
              {[3, 5, 7, 10, 14].map((n) => (
                <option key={n} value={n}>{t('settings.days', { n })}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-2xl bg-indigo-50/60 p-4">
          <h3 className="font-semibold">{t('settings.cloud')}</h3>
          <p className="mb-3 text-sm text-slate-500">{t('settings.cloudDesc')}</p>
          {canSync ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-soft bg-white" disabled={cloudBusy} onClick={cloudUpload}>
                {t('settings.cloudUpload')}
              </button>
              <button type="button" className="btn-soft bg-white" disabled={cloudBusy} onClick={cloudDownload}>
                {t('settings.cloudDownload')}
              </button>
            </div>
          ) : (
            <button type="button" className="btn-primary" onClick={onOpenAccount}>
              {account.status === 'user' ? t('plan.upgrade') : t('settings.cloudLogin')}
            </button>
          )}
          {cloudMsg && <p className="mt-2 text-sm font-medium text-indigo-700">{cloudMsg}</p>}
        </section>

        <section className="rounded-2xl bg-slate-50 p-4">
          <h3 className="font-semibold">{t('settings.data')}</h3>
          <p className="mb-3 text-sm text-slate-500">{t('settings.dataDesc')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-soft" onClick={exportData}>{t('settings.export')}</button>
            <button type="button" className="btn-soft" onClick={() => fileRef.current?.click()}>{t('settings.import')}</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn text-rose-600 hover:bg-rose-50"
              onClick={() => {
                if (window.confirm(t('settings.resetConfirm'))) {
                  onReset();
                  setDraft(DEFAULT_SETTINGS);
                  setMessage(t('settings.resetDone'));
                }
              }}
            >
              {t('settings.reset')}
            </button>
          </div>
          {message && <p className="mt-2 text-sm font-medium text-indigo-700">{message}</p>}
        </section>
      </div>
    </Sheet>
  );
}
