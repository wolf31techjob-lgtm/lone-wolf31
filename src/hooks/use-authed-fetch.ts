"use client";

import { useEffect, useState, useCallback } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Simple data-fetching hook with bearer-token auth and auto-refresh.
 */
export function useAuthedFetch<T>(
  url: string,
  token: string | null,
  options?: { intervalMs?: number; enabled?: boolean }
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs;

  const doFetch = useCallback(async () => {
    if (!token || !enabled) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error || `Request failed (${res.status})`);
        setData(null);
      } else {
        setData(json);
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [url, token, enabled]);

  useEffect(() => {
    setLoading(true);
    doFetch();
  }, [doFetch]);

  useEffect(() => {
    if (!intervalMs || !token || !enabled) return;
    const id = window.setInterval(doFetch, intervalMs);
    return () => window.clearInterval(id);
  }, [doFetch, intervalMs, token, enabled]);

  return { data, loading, error, refresh: doFetch };
}
