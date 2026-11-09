import { useEffect, useState } from 'react';

/**
 * Tiny client-side router (History API). Cloudflare Pages serves index.html for any
 * path that is not a file, so deep links like /pay/<token> open directly.
 *
 *   /                       the app
 *   /subscription           plans: Free · 14-day trial · Pro
 *   /trial/<token>          confirm starting the free trial
 *   /pay/<token>            PromptPay QR for one payment
 *   /receipt/<token>        payment status / receipt (after "I've paid")
 */
const listeners = new Set();

export function navigate(to, { replace = false } = {}) {
  if (to === window.location.pathname) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
  window.scrollTo(0, 0);
  listeners.forEach((fn) => fn());
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    listeners.add(update);
    window.addEventListener('popstate', update);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return path;
}

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

export function matchRoute(path) {
  const seg = path.split('/').filter(Boolean);
  const head = (seg[0] || '').toLowerCase(); // /Trial and /trial both work
  if (seg.length === 0) return { name: 'home' };
  if (head === 'subscription' && seg.length === 1) return { name: 'subscription' };
  if (['trial', 'pay', 'receipt'].includes(head) && seg.length === 2 && TOKEN.test(seg[1])) {
    return { name: head, token: seg[1] };
  }
  return { name: 'notfound' };
}

/** <a> that navigates without a full page reload. */
export function Link({ to, onClick, ...props }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
      {...props}
    />
  );
}
