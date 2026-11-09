import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import th from './locales/th.js';
import en from './locales/en.js';
import { MS_DAY, MS_HOUR, MS_MIN, startOfDay } from '../lib/time.js';

/**
 * LANGUAGES
 * ---------
 * To add a language:
 *   1. Copy src/i18n/locales/en.js to e.g. src/i18n/locales/ja.js and translate the values.
 *   2. Import it here and add one line below: ja: { name: '日本語', locale: 'ja-JP', dict: ja }
 * Missing keys automatically fall back to Thai, so a partial translation still works.
 */
export const LANGUAGES = {
  th: { name: 'ไทย', locale: 'th-TH', dict: th },
  en: { name: 'English', locale: 'en-US', dict: en },
};

export const DEFAULT_LANG = 'th';
const STORAGE_KEY = 'shp.lang.v1';

function detectLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES[saved]) return saved;
  } catch {
    /* storage blocked */
  }
  const prefs = (navigator.languages?.length ? navigator.languages : [navigator.language || ''])
    .map((l) => String(l).toLowerCase().split('-')[0]);
  // Thai is the primary language: anyone with Thai anywhere in their browser languages gets Thai.
  if (prefs.includes('th')) return 'th';
  return prefs.find((l) => LANGUAGES[l]) || DEFAULT_LANG;
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

function interpolate(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? String(vars[name]) : m));
}

export function translate(lang, key, vars) {
  let value = lookup(LANGUAGES[lang]?.dict, key);
  if (value === undefined) value = lookup(LANGUAGES[DEFAULT_LANG].dict, key);
  if (value === undefined) return key;
  if (value && typeof value === 'object' && ('one' in value || 'other' in value)) {
    value = vars?.n === 1 && value.one ? value.one : value.other ?? value.one;
  }
  return typeof value === 'string' ? interpolate(value, vars) : key;
}

/** Locale-aware formatters built on top of `t`. */
function makeFormatters(t, locale) {
  const duration = (minutes) => {
    const total = Math.max(0, Math.round(minutes));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return t('dur.m', { m });
    if (m === 0) return t('dur.h', { h });
    return t('dur.hm', { h, m });
  };
  const clock = (date) => new Date(date).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  const date = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
    new Date(d).toLocaleDateString(locale, opts);
  const weekday = (d, style = 'long') => new Date(d).toLocaleDateString(locale, { weekday: style });
  const number = (n, opts) => new Intl.NumberFormat(locale, opts).format(n);
  const money = (n) => number(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const due = (dueDate, now = new Date()) => {
    const diff = new Date(dueDate).getTime() - now.getTime();
    const dayDiff = Math.round((startOfDay(dueDate) - startOfDay(now)) / MS_DAY);
    if (diff < 0) {
      const late = -diff;
      if (late < MS_HOUR) return t('due.lateMin', { n: Math.max(1, Math.round(late / MS_MIN)) });
      if (late < MS_DAY) return t('due.lateHour', { n: Math.round(late / MS_HOUR) });
      return t('due.lateDay', { n: Math.round(late / MS_DAY) });
    }
    if (diff < MS_HOUR) return t('due.inMin', { n: Math.max(1, Math.round(diff / MS_MIN)) });
    if (dayDiff === 0) return t('due.inHour', { n: Math.round(diff / MS_HOUR) });
    if (dayDiff === 1) return t('due.tomorrow', { time: clock(dueDate) });
    if (dayDiff < 7) return t('due.weekday', { day: weekday(dueDate), time: clock(dueDate) });
    return t('due.date', { date: date(dueDate, { day: 'numeric', month: 'short' }) });
  };

  const dayHeading = (d, now = new Date()) => {
    const diff = Math.round((startOfDay(d) - startOfDay(now)) / MS_DAY);
    if (diff === 0) return t('day.today');
    if (diff === 1) return t('day.tomorrow');
    return new Date(d).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
  };

  /** Short weekday names Sun..Sat for the settings sliders. */
  const weekdayNames = () => {
    const sunday = new Date(2024, 0, 7); // a known Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
  };

  return { duration, clock, date, weekday, number, money, due, dayHeading, weekdayNames };
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage);

  const setLang = useCallback((next) => {
    if (!LANGUAGES[next]) return;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => {
    const locale = LANGUAGES[lang].locale;
    const t = (key, vars) => translate(lang, key, vars);
    return { lang, setLang, locale, t, fmt: makeFormatters(t, locale) };
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = value.t('app.title');
  }, [lang, value]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
