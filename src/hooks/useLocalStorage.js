import { useCallback, useEffect, useRef, useState } from 'react';

function read(key, fallback, revive) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return revive ? revive(parsed) : parsed;
  } catch {
    return fallback;
  }
}

/**
 * useState that persists to localStorage, survives reloads, and syncs
 * between open tabs. `revive` can validate/migrate stored data.
 */
export function useLocalStorage(key, initialValue, revive) {
  const reviveRef = useRef(revive);
  const [value, setValue] = useState(() => read(key, initialValue, revive));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked (private mode): the app keeps working in memory.
    }
  }, [key, value]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === key && e.newValue != null) {
        try {
          const parsed = JSON.parse(e.newValue);
          setValue(reviveRef.current ? reviveRef.current(parsed) : parsed);
        } catch {
          /* ignore malformed data from another tab */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const update = useCallback((next) => setValue(next), []);
  return [value, update];
}
