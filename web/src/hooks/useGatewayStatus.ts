import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../lib/api";
import type { GatewayStatus } from "../lib/types";

export function useGatewayStatus(enabled: boolean) {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);
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
      const res = await api<GatewayStatus>("/v1/gateway/status");
      if (mountedRef.current) setStatus(res);
    } catch (e) {
      if (mountedRef.current) setError((e as Error).message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const id = setInterval(() => void refresh(), 5000);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  const start = useCallback(async () => {
    setActionInProgress(true);
    setError("");
    try {
      const res = await api<GatewayStatus>("/v1/gateway:start", { method: "POST" });
      if (mountedRef.current) setStatus(res);
    } catch (e) {
      if (mountedRef.current) setError((e as Error).message);
    } finally {
      if (mountedRef.current) setActionInProgress(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setActionInProgress(true);
    setError("");
    try {
      const res = await api<GatewayStatus>("/v1/gateway:stop", { method: "POST" });
      if (mountedRef.current) setStatus(res);
    } catch (e) {
      if (mountedRef.current) setError((e as Error).message);
    } finally {
      if (mountedRef.current) setActionInProgress(false);
    }
  }, []);

  return { status, loading, error, actionInProgress, start, stop, refresh };
}
