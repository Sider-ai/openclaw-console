import { useCallback, useEffect, useState } from "react";

import { api } from "../lib/api";
import type { TelegramPairingEntry } from "../lib/types";

export function useTelegramPairings(enabled: boolean) {
  const [pairings, setPairings] = useState<TelegramPairingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ pairings: TelegramPairingEntry[] }>("/v1/channels/telegram/pairings");
      setPairings(res.pairings || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const interval = setInterval(() => void refresh(), 20000);
    return () => clearInterval(interval);
  }, [enabled, refresh]);

  async function approve(code: string) {
    setLoading(true);
    setError("");
    try {
      await api(`/v1/channels/telegram/pairings/${encodeURIComponent(code)}:approve`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  async function reject(code: string) {
    setLoading(true);
    setError("");
    try {
      await api(`/v1/channels/telegram/pairings/${encodeURIComponent(code)}:reject`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return { pairings, loading, error, refresh, approve, reject };
}
