import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import { buildChannelNav } from "../lib/navigation";
import type { ChannelNav, ChannelSummary } from "../lib/types";

export function useChannelsData(enabled: boolean) {
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ channels: ChannelSummary[] }>("/v1/channels");
      setChannels(res.channels || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  const channelNav: ChannelNav[] = useMemo(() => buildChannelNav(channels), [channels]);

  return {
    channelNav,
    channels,
    error,
    loading,
    refresh
  };
}
