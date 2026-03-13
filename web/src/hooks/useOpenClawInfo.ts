import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../lib/api";
import type { OpenClawInfo } from "../lib/types";

export function useOpenClawInfo(enabled: boolean) {
  const [info, setInfo] = useState<OpenClawInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<OpenClawInfo>("/v1/openclaw/info");
      if (mountedRef.current) setInfo(res);
    } catch (e) {
      if (mountedRef.current) setError((e as Error).message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  const update = useCallback(async () => {
    setUpdateInProgress(true);
    setError("");
    try {
      await api<{ name: string; output: string }>("/v1/openclaw:update", { method: "POST" });
      if (mountedRef.current) await refresh();
    } catch (e) {
      if (mountedRef.current) setError((e as Error).message);
    } finally {
      if (mountedRef.current) setUpdateInProgress(false);
    }
  }, [refresh]);

  return { info, loading, error, updateInProgress, refresh, update };
}
