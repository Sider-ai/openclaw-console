import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE, api } from "../lib/api";
import {
  buildModelProviderNav,
  fallbackProviderLabel,
  formatContextWindow
} from "../lib/navigation";
import type {
  CatalogEntry,
  CodexSession,
  ModelProviderNav,
  ModelSetting,
  Provider,
  ProviderSummary
} from "../lib/types";

export function useConsoleData(providerRoute: string | null) {
  const navigate = useNavigate();

  const [modelsExpanded, setModelsExpanded] = useState(providerRoute === null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modelSetting, setModelSetting] = useState<ModelSetting | null>(null);
  const [providerSummaries, setProviderSummaries] = useState<ProviderSummary[]>([]);
  const [providerNav, setProviderNav] = useState<ModelProviderNav[]>([]);

  const [openaiProvider, setOpenaiProvider] = useState<Provider | null>(null);
  const [codexProvider, setCodexProvider] = useState<Provider | null>(null);
  const [providerStatus, setProviderStatus] = useState<Provider | null>(null);

  const [apiKey, setAPIKey] = useState("");
  const [defaultModelInput, setDefaultModelInput] = useState("");
  const [defaultModelUnavailable, setDefaultModelUnavailable] = useState("");
  const [modelOptions, setModelOptions] = useState<CatalogEntry[]>([]);

  const [codexSession, setCodexSession] = useState<CodexSession | null>(null);
  const [redirectURL, setRedirectURL] = useState("");

  const inProgress = useMemo(() => {
    if (!codexSession) {
      return false;
    }
    return ["LAUNCHING_ONBOARD", "AWAITING_REDIRECT_URL", "EXCHANGING_TOKEN", "MERGING_CREDENTIALS", "RESTARTING_SERVICE"].includes(
      codexSession.state
    );
  }, [codexSession]);

  const providerLabel = useCallback(
    (providerID: string): string => {
      const found = providerSummaries.find((item) => item.providerId === providerID);
      if (found?.displayName) {
        return found.displayName;
      }
      return fallbackProviderLabel(providerID);
    },
    [providerSummaries]
  );

  const modelOptionLabel = useCallback(
    (entry: CatalogEntry): string =>
      `${providerLabel(entry.provider)} | ${entry.displayName || entry.modelKey} | ${entry.input || "-"} | ${formatContextWindow(entry.contextWindow)}`,
    [providerLabel]
  );

  const providerConnectionLabel = useCallback(
    (provider: Provider | null): "Connected" | "Not Configured" => (provider?.connection === "CONNECTED" ? "Connected" : "Not Configured"),
    []
  );

  const providerConnectionClass = useCallback(
    (provider: Provider | null): string =>
      provider?.connection === "CONNECTED" ? "status-badge status-badge-connected" : "status-badge status-badge-disconnected",
    []
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [setting, providerList, catalogSnapshot] = await Promise.all([
        api<ModelSetting>("/v1/modelSettings/default"),
        api<{ providers: ProviderSummary[] }>("/v1/providers"),
        api<{ modelCatalogEntries: CatalogEntry[] }>("/v1/modelCatalogEntries")
      ]);

      setModelSetting(setting);

      const nextProviders = providerList.providers || [];
      setProviderSummaries(nextProviders);

      const nextProviderNav = buildModelProviderNav(nextProviders);
      setProviderNav(nextProviderNav);

      const hasOpenAI = nextProviderNav.some((item) => item.id === "openai");
      if (providerRoute === "openai" && !hasOpenAI) {
        navigate("/models", { replace: true });
        return;
      }
      if (providerRoute && providerRoute !== "openai" && !nextProviderNav.some((item) => item.id === providerRoute)) {
        navigate("/models", { replace: true });
        return;
      }

      const providerLabelByID = new Map<string, string>();
      nextProviders.forEach((item) => {
        providerLabelByID.set(item.providerId, item.displayName || fallbackProviderLabel(item.providerId));
      });

      const availableModels = (catalogSnapshot.modelCatalogEntries || [])
        .filter((entry) => entry.available)
        .sort((a, b) => {
          const providerA = providerLabelByID.get(a.provider) || fallbackProviderLabel(a.provider);
          const providerB = providerLabelByID.get(b.provider) || fallbackProviderLabel(b.provider);
          const providerCmp = providerA.localeCompare(providerB);
          if (providerCmp !== 0) {
            return providerCmp;
          }
          const nameA = (a.displayName || a.modelKey).toLowerCase();
          const nameB = (b.displayName || b.modelKey).toLowerCase();
          return nameA.localeCompare(nameB);
        });
      setModelOptions(availableModels);

      const currentDefault = setting.defaultModel || "";
      const currentDefaultAvailable = !!currentDefault && availableModels.some((entry) => entry.modelKey === currentDefault);
      setDefaultModelUnavailable(currentDefault && !currentDefaultAvailable ? currentDefault : "");
      setDefaultModelInput(currentDefaultAvailable ? currentDefault : (availableModels[0]?.modelKey || ""));

      if (!providerRoute) {
        setOpenaiProvider(null);
        setCodexProvider(null);
        setProviderStatus(null);
      } else if (providerRoute === "openai") {
        const [openai, codex] = await Promise.all([api<Provider>("/v1/providers/openai"), api<Provider>("/v1/providers/openai-codex")]);
        setOpenaiProvider(openai);
        setCodexProvider(codex);
        setProviderStatus(null);
      } else {
        const status = await api<Provider>(`/v1/providers/${encodeURIComponent(providerRoute)}`);
        setProviderStatus(status);
        setOpenaiProvider(null);
        setCodexProvider(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [navigate, providerRoute]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!codexSession?.sessionId || !inProgress) {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const next = await api<CodexSession>(`/v1/codexAuthSessions/${codexSession.sessionId}`);
        setCodexSession(next);
        if (["SUCCEEDED", "FAILED", "EXPIRED", "CANCELLED"].includes(next.state)) {
          void refresh();
          clearInterval(timer);
        }
      } catch {
        clearInterval(timer);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [codexSession?.sessionId, inProgress, refresh]);

  async function connectAPIKey(providerID: string) {
    setLoading(true);
    setError("");
    try {
      await api(`/v1/providers/${encodeURIComponent(providerID)}:connectApiKey`, {
        method: "POST",
        body: JSON.stringify({
          apiKey
        })
      });
      setAPIKey("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function disconnectProvider(providerID: string) {
    const confirmed = window.confirm(`Disconnect provider "${providerID}"?`);
    if (!confirmed) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api(`/v1/providers/${encodeURIComponent(providerID)}:disconnect`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function updateDefaultModel() {
    setLoading(true);
    setError("");
    try {
      const res = await api<ModelSetting>("/v1/modelSettings/default?update_mask=default_model", {
        method: "PATCH",
        body: JSON.stringify({ defaultModel: defaultModelInput })
      });
      setModelSetting(res);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function startCodexSession() {
    setLoading(true);
    setError("");
    try {
      const session = await api<CodexSession>("/v1/codexAuthSessions", {
        method: "POST",
        body: JSON.stringify({ defaultModelHint: "openai-codex/gpt-5.3-codex" })
      });
      setCodexSession(session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRedirect() {
    if (!codexSession?.sessionId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const next = await api<CodexSession>(`/v1/codexAuthSessions/${codexSession.sessionId}:submitRedirect`, {
        method: "POST",
        body: JSON.stringify({ redirectUrl: redirectURL })
      });
      setCodexSession(next);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelSession() {
    if (!codexSession?.sessionId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const next = await api<CodexSession>(`/v1/codexAuthSessions/${codexSession.sessionId}:cancel`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setCodexSession(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return {
    apiBase: API_BASE,
    apiKey,
    cancelSession,
    codexProvider,
    codexSession,
    connectAPIKey,
    defaultModelInput,
    defaultModelUnavailable,
    disconnectProvider,
    error,
    inProgress,
    loading,
    modelOptionLabel,
    modelOptions,
    modelSetting,
    modelsExpanded,
    openaiProvider,
    providerConnectionClass,
    providerConnectionLabel,
    providerLabel,
    providerNav,
    providerStatus,
    redirectURL,
    refresh,
    setAPIKey,
    setDefaultModelInput,
    setModelsExpanded,
    setRedirectURL,
    startCodexSession,
    submitRedirect,
    updateDefaultModel
  };
}
