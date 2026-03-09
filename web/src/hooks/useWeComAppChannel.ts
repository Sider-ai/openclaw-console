import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import type { PluginInstallResult, WeComAppChannel } from "../lib/types";

type WeComAppForm = {
  enabled: boolean;
  corpId: string;
  corpSecret: string;
  agentId: string;
  token: string;
  encodingAesKey: string;
  webhookPath: string;
  apiBaseUrl: string;
  dmPolicy: string;
  allowFrom: string[];
  welcomeText: string;
};

function normalizeAllowFrom(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
}

export function useWeComAppChannel(enabled: boolean, onChanged?: () => Promise<void>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<WeComAppChannel | null>(null);
  const [installResult, setInstallResult] = useState<PluginInstallResult | null>(null);
  const [form, setForm] = useState<WeComAppForm>({
    enabled: true,
    corpId: "",
    corpSecret: "",
    agentId: "",
    token: "",
    encodingAesKey: "",
    webhookPath: "",
    apiBaseUrl: "",
    dmPolicy: "open",
    allowFrom: ["*"],
    welcomeText: ""
  });

  const syncForm = useCallback((nextChannel: WeComAppChannel) => {
    setForm({
      enabled: nextChannel.enabled,
      corpId: nextChannel.corpId || "",
      corpSecret: "",
      agentId: nextChannel.agentId || "",
      token: "",
      encodingAesKey: "",
      webhookPath: nextChannel.webhookPath || "",
      apiBaseUrl: nextChannel.apiBaseUrl || "",
      dmPolicy: nextChannel.dmPolicy || "open",
      allowFrom: normalizeAllowFrom(nextChannel.allowFrom || ["*"]),
      welcomeText: nextChannel.welcomeText || ""
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<WeComAppChannel>("/v1/channels/wecom-app");
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
      (channel.corpId || "") !== form.corpId.trim() ||
      (channel.agentId || "") !== form.agentId.trim() ||
      (channel.webhookPath || "") !== form.webhookPath.trim() ||
      (channel.apiBaseUrl || "") !== form.apiBaseUrl.trim() ||
      (channel.dmPolicy || "open") !== form.dmPolicy ||
      normalizeAllowFrom(channel.allowFrom || ["*"]).join(",") !== normalizeAllowFrom(form.allowFrom).join(",") ||
      (channel.welcomeText || "") !== form.welcomeText.trim()
    );
  }, [channel, form]);

  async function installPlugin() {
    setLoading(true);
    setError("");
    try {
      const res = await api<PluginInstallResult>("/v1/plugins/wecom-app:install", {
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
        corpId: form.corpId.trim(),
        agentId: form.agentId.trim(),
        webhookPath: form.webhookPath.trim(),
        apiBaseUrl: form.apiBaseUrl.trim(),
        dmPolicy: form.dmPolicy,
        allowFrom: normalizeAllowFrom(form.allowFrom),
        welcomeText: form.welcomeText.trim()
      };
      if (form.corpSecret.trim()) {
        payload.corpSecret = form.corpSecret.trim();
      }
      if (form.token.trim()) {
        payload.token = form.token.trim();
      }
      if (form.encodingAesKey.trim()) {
        payload.encodingAesKey = form.encodingAesKey.trim();
      }
      const res = await api<WeComAppChannel>("/v1/channels/wecom-app", {
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
    const confirmed = window.confirm("Remove the WeCom App configuration from OpenClaw?");
    if (!confirmed) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api<WeComAppChannel>("/v1/channels/wecom-app:disconnect", {
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
