import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import type { PluginInstallResult, QQBotChannel } from "../lib/types";

type QQBotForm = {
  enabled: boolean;
  appId: string;
  clientSecret: string;
  allowFrom: string[];
  markdownSupport: boolean;
  imageServerBaseUrl: string;
};

function normalizeAllowFrom(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
}

export function useQQBotChannel(enabled: boolean, onChanged?: () => Promise<void>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<QQBotChannel | null>(null);
  const [installResult, setInstallResult] = useState<PluginInstallResult | null>(null);
  const [form, setForm] = useState<QQBotForm>({
    enabled: true,
    appId: "",
    clientSecret: "",
    allowFrom: ["*"],
    markdownSupport: true,
    imageServerBaseUrl: ""
  });

  const syncForm = useCallback((nextChannel: QQBotChannel) => {
    setForm({
      enabled: nextChannel.enabled,
      appId: nextChannel.appId || "",
      clientSecret: "",
      allowFrom: normalizeAllowFrom(nextChannel.allowFrom || ["*"]),
      markdownSupport: nextChannel.markdownSupport,
      imageServerBaseUrl: nextChannel.imageServerBaseUrl || ""
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<QQBotChannel>("/v1/channels/qqbot");
      setChannel(res);
      syncForm(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [syncForm]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  const isDirty = useMemo(() => {
    if (!channel) {
      return false;
    }
    return (
      channel.enabled !== form.enabled ||
      (channel.appId || "") !== form.appId.trim() ||
      normalizeAllowFrom(channel.allowFrom || ["*"]).join(",") !== normalizeAllowFrom(form.allowFrom).join(",") ||
      channel.markdownSupport !== form.markdownSupport ||
      (channel.imageServerBaseUrl || "") !== form.imageServerBaseUrl.trim()
    );
  }, [channel, form]);

  async function installPlugin() {
    setLoading(true);
    setError("");
    try {
      const res = await api<PluginInstallResult>("/v1/plugins/qqbot:install", {
        method: "POST",
        body: JSON.stringify({})
      });
      setInstallResult(res);
      await refresh();
      if (onChanged) {
        await onChanged();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        enabled: form.enabled,
        appId: form.appId.trim(),
        allowFrom: normalizeAllowFrom(form.allowFrom),
        markdownSupport: form.markdownSupport,
        imageServerBaseUrl: form.imageServerBaseUrl.trim()
      };
      if (form.clientSecret.trim()) {
        payload.clientSecret = form.clientSecret.trim();
      }
      const res = await api<QQBotChannel>("/v1/channels/qqbot", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setChannel(res);
      syncForm(res);
      if (onChanged) {
        await onChanged();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    const confirmed = window.confirm("Remove the QQ Bot configuration from OpenClaw?");
    if (!confirmed) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api<QQBotChannel>("/v1/channels/qqbot:disconnect", {
        method: "POST",
        body: JSON.stringify({})
      });
      setChannel(res);
      syncForm(res);
      if (onChanged) {
        await onChanged();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return {
    channel,
    disconnect,
    error,
    form,
    installPlugin,
    installResult,
    isDirty,
    loading,
    refresh,
    save,
    setForm
  };
}
