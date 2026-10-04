import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ---------- Debounce hook ---------- */
export function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ---------- Session cache for search results ---------- */
const CACHE_KEY = "bibliotheke-cache-v1";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

type CacheEntry<T> = { data: T; ts: number };

export function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, CacheEntry<T>>;
    const entry = map[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
      delete map[key];
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(map));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T): void {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, CacheEntry<T>>;
    map[key] = { data, ts: Date.now() };
    // Prune old entries if too many
    const keys = Object.keys(map);
    if (keys.length > 50) {
      const sorted = keys
        .map((k) => ({ k, ts: map[k].ts }))
        .sort((a, b) => a.ts - b.ts)
        .slice(0, keys.length - 50);
      for (const { k } of sorted) delete map[k];
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* quota exceeded — ignore */
  }
}

/* ---------- Reduced motion detection ---------- */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  });
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ---------- Performance mode (user toggle) ---------- */
const PERF_KEY = "bibliotheke-perf-mode";
export function usePerfMode(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(PERF_KEY) === "1";
    } catch {
      return false;
    }
  });
  const set = useCallback((v: boolean) => {
    setOn(v);
    try {
      localStorage.setItem(PERF_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);
  return [on, set];
}

/* ---------- useStableCallback — avoids re-creating closures ---------- */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = useRef(fn);
  ref.current = fn;
  return useMemo(() => ((...args: A) => ref.current(...args)) as typeof fn, []);
}
