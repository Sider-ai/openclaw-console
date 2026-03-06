import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import type { TelegramChannel, TelegramChannelTestResult } from "../lib/types";

type TelegramChannelForm = {
  enabled: boolean;
  botToken: string;
  dmPolicy: string;
  allowFrom: string[];
  groupPolicy: string;
  requireMention: boolean;
};

function normalizeAllowFrom(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
}

function allowFromToText(values?: string[]): string {
  return normalizeAllowFrom(values || []).join(", ");
}

function parseAllowFrom(values: string[]): string[] {
  return normalizeAllowFrom(values)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function useTelegramChannel(enabled: boolean, onChanged?: () => Promise<void>, options?: { requestConfirm?: (msg: string) => Promise<boolean> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<TelegramChannel | null>(null);
  const [testResult, setTestResult] = useState<TelegramChannelTestResult | null>(null);
  const [form, setForm] = useState<TelegramChannelForm>({
    enabled: true,
    botToken: "",
    dmPolicy: "pairing",
    allowFrom: [],
    groupPolicy: "allowlist",
    requireMention: true
  });

  const syncForm = useCallback((nextChannel: TelegramChannel) => {
    setForm({
      enabled: nextChannel.enabled,
      botToken: "",
      dmPolicy: nextChannel.dmPolicy || "pairing",
      allowFrom: normalizeAllowFrom(nextChannel.allowFrom || []),
      groupPolicy: nextChannel.groupPolicy || "allowlist",
      requireMention: nextChannel.requireMention
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<TelegramChannel>("/v1/channels/telegram");
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
      channel.dmPolicy !== form.dmPolicy ||
      (channel.groupPolicy || "allowlist") !== form.groupPolicy ||
      channel.requireMention !== form.requireMention ||
      allowFromToText(channel.allowFrom) !== allowFromToText(form.allowFrom)
    );
  }, [channel, form]);

  async function save() {
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        enabled: form.enabled,
        dmPolicy: form.dmPolicy,
        allowFrom: parseAllowFrom(form.allowFrom),
        groupPolicy: form.groupPolicy,
        requireMention: form.requireMention
      };
      if (form.botToken.trim()) {
        payload.botToken = form.botToken.trim();
      }
      const res = await api<TelegramChannel>("/v1/channels/telegram", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setChannel(res);
      setTestResult(null);
      syncForm(res);
      if (onChanged) {
        await onChanged()
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function testConnection() {
    setLoading(true);
    setError("");
    try {
      const res = await api<TelegramChannelTestResult>("/v1/channels/telegram:test", {
        method: "POST",
        body: JSON.stringify({
          botToken: form.botToken.trim() || undefined
        })
      });
      setTestResult(res);
    } catch (e) {
      setError((e as Error).message);
      setTestResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    const confirmed = options?.requestConfirm
      ? await options.requestConfirm("Remove the Telegram bot configuration from OpenClaw?")
      : window.confirm("Remove the Telegram bot configuration from OpenClaw?");
    if (!confirmed) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api<TelegramChannel>("/v1/channels/telegram:disconnect", {
        method: "POST",
        body: JSON.stringify({})
      });
      setChannel(res);
      setTestResult(null);
      syncForm(res);
      if (onChanged) {
        await onChanged()
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return {
    channel,
    error,
    form,
    isDirty,
    loading,
    refresh,
    setForm,
    testConnection,
    testResult,
    disconnect,
    save
  };
}
