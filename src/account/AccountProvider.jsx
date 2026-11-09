import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api.js';

/**
 * Account + plan state.
 *   status: 'loading' | 'guest' (not logged in) | 'user' | 'offline' (API not reachable / not set up)
 *   isPro:  trial or paid membership is active. In local development (`npm run dev`)
 *           without the API, everything is unlocked so you can work on the UI.
 */
const AccountContext = createContext(null);

const POLL_MS = 30_000;

export function AccountProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [me, setMe] = useState(null);
  const [pricing, setPricing] = useState({ priceThb: 49, trialDays: 14, configured: false });
  const loadedOnce = useRef(false);

  const applyMe = useCallback((data) => {
    setMe(data);
    if (data?.pricing) setPricing((p) => ({ ...p, ...data.pricing }));
    setStatus('user');
  }, []);

  const refresh = useCallback(async () => {
    try {
      applyMe(await api('/me'));
    } catch (err) {
      setMe(null);
      if (err instanceof ApiError && err.status === 401) {
        setStatus('guest');
        api('/billing/config')
          .then((cfg) => setPricing((p) => ({ ...p, ...cfg })))
          .catch(() => {});
      } else {
        setStatus('offline');
      }
    } finally {
      loadedOnce.current = true;
    }
  }, [applyMe]);

  useEffect(() => {
    refresh();
    const onVisible = () => document.visibilityState === 'visible' && loadedOnce.current && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  // While a transfer is waiting for review, poll so the plan flips to Pro without a reload.
  const waiting = me?.openPayment?.status === 'submitted';
  useEffect(() => {
    if (!waiting) return undefined;
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [waiting, refresh]);

  const login = useCallback(
    async (email, password) => {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      applyMe(data);
      return data;
    },
    [applyMe],
  );

  const register = useCallback(
    async (fields) => {
      const data = await api('/auth/register', { method: 'POST', body: fields });
      applyMe(data);
      return data;
    },
    [applyMe],
  );

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setMe(null);
      setStatus('guest');
    }
  }, []);

  const value = useMemo(() => {
    const plan = me?.plan ?? null;
    const devUnlock = import.meta.env.DEV && status === 'offline';
    const isPro = devUnlock || (status === 'user' && (plan?.status === 'trial' || plan?.status === 'active'));
    return {
      status,
      user: me?.user ?? null,
      plan,
      openPayment: me?.openPayment ?? null,
      pricing,
      isPro,
      devUnlock,
      refresh,
      login,
      register,
      logout,
      setOpenPayment: (payment) => setMe((m) => (m ? { ...m, openPayment: payment } : m)),
    };
  }, [status, me, pricing, refresh, login, register, logout]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>');
  return ctx;
}
