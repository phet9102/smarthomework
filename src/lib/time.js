const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

export { MS_MIN, MS_HOUR, MS_DAY };

/** Midnight (local time) of the given date. */
export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Local YYYY-MM-DD key, used to bucket schedule entries by day. */
export function dayKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Value for <input type="datetime-local"> in local time. */
export function toInputDateTime(date) {
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dayKey(d)}T${hh}:${mm}`;
}

/** Parses "HH:MM" into minutes after midnight. */
export function parseClock(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function formatClock(date) {
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "45m", "1h 30m", "2h". */
export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Human-friendly time-until-due label, e.g. "Due in 3h", "Due tomorrow", "2 days late". */
export function formatDue(due, now = new Date()) {
  const diff = new Date(due).getTime() - now.getTime();
  const dueDay = startOfDay(due).getTime();
  const today = startOfDay(now).getTime();
  const dayDiff = Math.round((dueDay - today) / MS_DAY);

  if (diff < 0) {
    const late = -diff;
    if (late < MS_HOUR) return `${Math.max(1, Math.round(late / MS_MIN))}m late`;
    if (late < MS_DAY) return `${Math.round(late / MS_HOUR)}h late`;
    const days = Math.round(late / MS_DAY);
    return `${days} day${days === 1 ? '' : 's'} late`;
  }
  if (diff < MS_HOUR) return `Due in ${Math.max(1, Math.round(diff / MS_MIN))}m`;
  if (dayDiff === 0) return `Due in ${Math.round(diff / MS_HOUR)}h`;
  if (dayDiff === 1) return `Due tomorrow ${formatClock(due)}`;
  if (dayDiff < 7) {
    const wd = new Date(due).toLocaleDateString([], { weekday: 'short' });
    return `Due ${wd} ${formatClock(due)}`;
  }
  return `Due ${new Date(due).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export function formatDayHeading(date, now = new Date()) {
  const diff = Math.round((startOfDay(date) - startOfDay(now)) / MS_DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return new Date(date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
