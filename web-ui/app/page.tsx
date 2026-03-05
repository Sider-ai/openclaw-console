"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ModelSetting = {
  name: string;
  defaultModel: string;
};

type Provider = {
  name: string;
  providerId: string;
  connection: string;
  authType: string;
  profileLabels?: string[];
};

type ProviderSummary = {
  name: string;
  providerId: string;
  displayName: string;
  managed: boolean;
};

type ModelProviderNav = {
  id: string;
  label: string;
};

type CatalogEntry = {
  name: string;
  modelKey: string;
  displayName: string;
  provider: string;
  input: string;
  contextWindow: number;
  available: boolean;
  tags?: string[];
};

type CodexSession = {
  name: string;
  sessionId: string;
  state: string;
  authUrl?: string;
  expiresAt: number;
  errorCode?: string;
  errorMessage?: string;
};

type NavKey = "agents" | "channels" | "tools" | "models";
const MODEL_DEFAULTS_NODE = "__model_defaults__";

const API_BASE = (process.env.NEXT_PUBLIC_ADMIN_API_BASE || "/api").replace(/\/$/, "");
const DOCS_PROVIDER_ROOT = "https://docs.openclaw.ai/providers";

const ROOT_NAV_ITEMS: { key: Exclude<NavKey, "models">; label: string }[] = [
  { key: "agents", label: "Agents" },
  { key: "channels", label: "Channels" },
  { key: "tools", label: "Tools" }
];

function fallbackProviderLabel(providerId: string): string {
  const parts = providerId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return parts.join(" ") || providerId;
}

function buildModelProviderNav(providers: ProviderSummary[]): ModelProviderNav[] {
  const byID = new Map<string, ProviderSummary>();
  providers.forEach((item) => byID.set(item.providerId, item));

  const out: ModelProviderNav[] = [];
  const hasOpenAI = byID.has("openai") || byID.has("openai-codex");

  if (hasOpenAI) {
    out.push({ id: "openai", label: "OpenAI" });
  }

  const sorted = [...providers].sort((a, b) => a.displayName.localeCompare(b.displayName));
  sorted.forEach((item) => {
    if (item.providerId === "openai-codex") {
      return;
    }
    if (item.providerId === "openai" && hasOpenAI) {
      return;
    }
    out.push({
      id: item.providerId,
      label: item.displayName || fallbackProviderLabel(item.providerId)
    });
  });

  if (out.length === 0) {
    out.push({ id: "openai", label: "OpenAI" });
  }

  return out;
}

function providerDocsURL(provider: string): string {
  if (provider === "openai") {
    return `${DOCS_PROVIDER_ROOT}/openai`;
  }
  return DOCS_PROVIDER_ROOT;
}

export default function Page() {
  const [activeNav, setActiveNav] = useState<NavKey>("models");
  const [modelsExpanded, setModelsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modelSetting, setModelSetting] = useState<ModelSetting | null>(null);
  const [providerSummaries, setProviderSummaries] = useState<ProviderSummary[]>([]);
  const [providerNav, setProviderNav] = useState<ModelProviderNav[]>([]);
  const [activeModelProvider, setActiveModelProvider] = useState(MODEL_DEFAULTS_NODE);

  const [openaiProvider, setOpenaiProvider] = useState<Provider | null>(null);
  const [codexProvider, setCodexProvider] = useState<Provider | null>(null);
  const [providerStatus, setProviderStatus] = useState<Provider | null>(null);

  const [apiKey, setApiKey] = useState("");
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

  const activeProviderLabel = useMemo(() => {
    if (activeModelProvider === MODEL_DEFAULTS_NODE) {
      return "Models";
    }
    const item = providerNav.find((it) => it.id === activeModelProvider);
    return item?.label || fallbackProviderLabel(activeModelProvider);
  }, [providerNav, activeModelProvider]);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    return data as T;
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [setting, providerList] = await Promise.all([
        api<ModelSetting>("/v1/modelSettings/default"),
        api<{ providers: ProviderSummary[] }>("/v1/providers")
      ]);

      setModelSetting(setting);

      const nextProviders = providerList.providers || [];
      setProviderSummaries(nextProviders);

      const nextProviderNav = buildModelProviderNav(nextProviders);
      setProviderNav(nextProviderNav);

      if (activeModelProvider !== MODEL_DEFAULTS_NODE && !nextProviderNav.some((item) => item.id === activeModelProvider)) {
        setActiveModelProvider(MODEL_DEFAULTS_NODE);
      }

      const providerLabelByID = new Map<string, string>();
      nextProviders.forEach((item) => {
        providerLabelByID.set(item.providerId, item.displayName || fallbackProviderLabel(item.providerId));
      });

      const providerIDs = Array.from(new Set(nextProviders.map((item) => item.providerId).filter(Boolean)));
      const catalogFetches = await Promise.allSettled(
        providerIDs.map(async (providerID) => {
          const all: CatalogEntry[] = [];
          let pageToken = "";
          for (;;) {
            const query = new URLSearchParams({
              provider: providerID,
              page_size: "200"
            });
            if (pageToken) {
              query.set("page_token", pageToken);
            }
            const res = await api<{ modelCatalogEntries: CatalogEntry[]; nextPageToken?: string }>(
              `/v1/modelCatalogEntries?${query.toString()}`
            );
            all.push(...(res.modelCatalogEntries || []));
            if (!res.nextPageToken) {
              break;
            }
            pageToken = res.nextPageToken;
          }
          return all.map((entry) => ({
            ...entry,
            provider: entry.provider || providerID
          }));
        })
      );

      const availableModels = catalogFetches
        .filter((item): item is PromiseFulfilledResult<CatalogEntry[]> => item.status === "fulfilled")
        .flatMap((item) => item.value)
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

      if (activeModelProvider === MODEL_DEFAULTS_NODE) {
        setOpenaiProvider(null);
        setCodexProvider(null);
        setProviderStatus(null);
      } else if (activeModelProvider === "openai") {
        const [openai, codex] = await Promise.all([api<Provider>("/v1/providers/openai"), api<Provider>("/v1/providers/openai-codex")]);
        setOpenaiProvider(openai);
        setCodexProvider(codex);
        setProviderStatus(null);
      } else {
        const status = await api<Provider>(`/v1/providers/${encodeURIComponent(activeModelProvider)}`);
        setProviderStatus(status);
        setOpenaiProvider(null);
        setCodexProvider(null);
      }

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeModelProvider]);

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

  async function connectAPIKey() {
    setLoading(true);
    setError("");
    try {
      await api("/v1/providers/openai:connectApiKey", {
        method: "POST",
        body: JSON.stringify({
          apiKey,
          defaultModel: defaultModelInput || undefined
        })
      });
      setApiKey("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function disconnectProvider(providerID: "openai" | "openai-codex") {
    const confirmed = window.confirm(`Disconnect provider "${providerID}"?`);
    if (!confirmed) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api(`/v1/providers/${providerID}:disconnect`, {
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

  function renderPlaceholder(title: string, desc: string) {
    return (
      <section className="panel">
        <h2>{title}</h2>
        <p className="muted">{desc}</p>
      </section>
    );
  }

  function providerLabel(providerID: string): string {
    const found = providerSummaries.find((item) => item.providerId === providerID);
    if (found?.displayName) {
      return found.displayName;
    }
    return fallbackProviderLabel(providerID);
  }

  function formatContextWindow(windowSize: number): string {
    if (!windowSize || windowSize <= 0) {
      return "-";
    }
    if (windowSize >= 1000) {
      return `${Math.round(windowSize / 1000)}k`;
    }
    return String(windowSize);
  }

  function modelOptionLabel(entry: CatalogEntry): string {
    return `${providerLabel(entry.provider)} | ${entry.displayName || entry.modelKey} | ${entry.input || "-"} | ${formatContextWindow(entry.contextWindow)}`;
  }

  function providerConnectionLabel(provider: Provider | null): "Connected" | "Not Configured" {
    return provider?.connection === "CONNECTED" ? "Connected" : "Not Configured";
  }

  function providerConnectionClass(provider: Provider | null): string {
    return provider?.connection === "CONNECTED" ? "status-badge status-badge-connected" : "status-badge status-badge-disconnected";
  }

  function renderModelDefaultsSection() {
    return (
      <section className="panel">
        <div className="panel-title-row">
          <h2>Default Model</h2>
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
        <div className="form-row">
          <select value={defaultModelInput} onChange={(e) => setDefaultModelInput(e.target.value)} disabled={loading || modelOptions.length === 0}>
            {modelOptions.length === 0 && <option value="">No available models</option>}
            {modelOptions.map((entry) => (
              <option key={`${entry.provider}:${entry.modelKey}`} value={entry.modelKey}>
                {modelOptionLabel(entry)}
              </option>
            ))}
          </select>
          <button className="btn" onClick={updateDefaultModel} disabled={loading || !defaultModelInput.trim() || modelOptions.length === 0}>
            Set Default Model
          </button>
        </div>
        <p className="muted">Only available models are listed. Format: Provider | Display Name | Input | Context Window.</p>
        {defaultModelUnavailable && (
          <p className="muted">Current default model is unavailable and not listed: {defaultModelUnavailable}</p>
        )}
        <p className="muted">Resource: {modelSetting?.name || "modelSettings/default"}</p>
        <details>
          <summary>Advanced: Available Model Catalog (raw)</summary>
          <pre>{JSON.stringify(modelOptions, null, 2)}</pre>
        </details>
      </section>
    );
  }

  function renderOpenAIWorkspace() {
    return (
      <>
        <section className="panel">
          <div className="panel-title-row">
            <h2>OpenAI Provider</h2>
            <a href={providerDocsURL("openai")} target="_blank" rel="noreferrer">
              Docs
            </a>
          </div>
          <p className="muted">OpenAI provides two auth methods in OpenClaw Console: API Key and Codex subscription.</p>
        </section>

        <section className="panel">
          <h2>Provider Status</h2>
          <div className="status-grid">
            <div className="status-row">
              <span>OpenAI API Key</span>
              <span className={providerConnectionClass(openaiProvider)}>{providerConnectionLabel(openaiProvider)}</span>
            </div>
            <div className="status-row">
              <span>OpenAI Codex Subscription</span>
              <span className={providerConnectionClass(codexProvider)}>{providerConnectionLabel(codexProvider)}</span>
            </div>
          </div>
          <details>
            <summary>Advanced: Raw Provider Status</summary>
            <pre>{JSON.stringify({ openai: openaiProvider, openaiCodex: codexProvider }, null, 2)}</pre>
          </details>
        </section>

        <section className="panel">
          <h2>OpenAI API Key</h2>
          <div className="form-row">
            <input placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <button className="btn" onClick={connectAPIKey} disabled={loading || !apiKey.trim()}>
              Connect API Key
            </button>
            <button
              className="btn btn-warn"
              onClick={() => {
                void disconnectProvider("openai");
              }}
              disabled={loading || openaiProvider?.connection !== "CONNECTED"}
            >
              Disconnect
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>OpenAI Codex Subscription</h2>
          <div className="form-row compact">
            <button className="btn" onClick={startCodexSession} disabled={loading || inProgress}>
              Start Session
            </button>
            <button className="btn btn-warn" onClick={cancelSession} disabled={loading || !codexSession}>
              Cancel Session
            </button>
            <button
              className="btn btn-warn"
              onClick={() => {
                void disconnectProvider("openai-codex");
              }}
              disabled={loading || codexProvider?.connection !== "CONNECTED"}
            >
              Disconnect
            </button>
          </div>

          {codexSession && (
            <>
              <p>
                State: <span className={codexSession.state === "SUCCEEDED" ? "status-ok" : "status-warn"}>{codexSession.state}</span>
              </p>
              {codexSession.authUrl && (
                <p>
                  <a href={codexSession.authUrl} target="_blank" rel="noreferrer">
                    Open OpenAI Login URL
                  </a>
                </p>
              )}
              <textarea
                placeholder="Paste redirect URL from browser address bar"
                value={redirectURL}
                onChange={(e) => setRedirectURL(e.target.value)}
              />
              <div className="form-row compact">
                <button className="btn" onClick={submitRedirect} disabled={loading || !redirectURL.trim()}>
                  Submit Redirect URL
                </button>
              </div>
              <pre>{JSON.stringify(codexSession, null, 2)}</pre>
            </>
          )}
        </section>
      </>
    );
  }

  function renderReadOnlyProviderWorkspace() {
    return (
      <>
        <section className="panel">
          <div className="panel-title-row">
            <h2>{activeProviderLabel} Provider</h2>
            <a href={providerDocsURL(activeModelProvider)} target="_blank" rel="noreferrer">
              Docs
            </a>
          </div>
          <p className="muted">This provider page is read-only for now. You can view provider status.</p>
        </section>

        <section className="panel">
          <h2>Provider Status</h2>
          <div className="status-row">
            <span>{activeProviderLabel}</span>
            <span className={providerConnectionClass(providerStatus)}>{providerConnectionLabel(providerStatus)}</span>
          </div>
          <details>
            <summary>Advanced: Raw Provider Status</summary>
            <pre>{JSON.stringify(providerStatus, null, 2)}</pre>
          </details>
        </section>
      </>
    );
  }

  function renderModelDefaultsWorkspace() {
    return (
      <>
        <section className="panel">
          <h2>Models</h2>
          <p className="muted">Set the global default model used by OpenClaw from available catalog entries.</p>
        </section>
        {renderModelDefaultsSection()}
      </>
    );
  }

  function renderModelsWorkspace() {
    if (activeModelProvider === MODEL_DEFAULTS_NODE) {
      return renderModelDefaultsWorkspace();
    }
    if (activeModelProvider === "openai") {
      return renderOpenAIWorkspace();
    }
    return renderReadOnlyProviderWorkspace();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">OC</span>
          <div>
            <div className="brand-title">OpenClaw Console</div>
            <div className="brand-subtitle">Admin Workspace</div>
          </div>
        </div>
        <div className="topbar-meta">
          <span className={loading ? "pill pill-warn" : "pill pill-ok"}>{loading ? "Syncing" : "Ready"}</span>
          <span className="muted">{API_BASE}</span>
        </div>
      </header>

      <div className="body-layout">
        <aside className="sidebar">
          <div className="sidebar-title">OpenClaw</div>
          <nav className="nav-list">
            {ROOT_NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={item.key === activeNav ? "nav-item nav-item-active" : "nav-item"}
                onClick={() => setActiveNav(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}

            <div className="nav-group">
              <button
                className={activeNav === "models" ? "nav-item nav-item-active" : "nav-item"}
                onClick={() => {
                  setActiveNav("models");
                  setActiveModelProvider(MODEL_DEFAULTS_NODE);
                  setModelsExpanded((prev) => !prev);
                }}
                type="button"
              >
                <span>Models</span>
                <span className="nav-caret">{modelsExpanded ? "v" : ">"}</span>
              </button>

              {modelsExpanded && (
                <div className="subnav-list">
                  {providerNav.map((item) => (
                    <button
                      key={item.id}
                      className={activeNav === "models" && activeModelProvider === item.id ? "subnav-item subnav-item-active" : "subnav-item"}
                      onClick={() => {
                        setActiveNav("models");
                        setModelsExpanded(true);
                        setActiveModelProvider(item.id);
                      }}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                  {providerNav.length === 0 && <p className="muted subnav-empty">No providers detected.</p>}
                </div>
              )}
            </div>
          </nav>
        </aside>

        <main className="workspace">
          {error && (
            <section className="panel panel-error">
              <h2>Error</h2>
              <pre>{error}</pre>
            </section>
          )}

          {activeNav === "models" && renderModelsWorkspace()}
          {activeNav === "agents" && renderPlaceholder("Agents", "Agent resources will be managed here. API hooks can be added in the next iteration.")}
          {activeNav === "channels" && renderPlaceholder("Channels", "Channel resources (Telegram, Slack, etc.) will be configured here.")}
          {activeNav === "tools" && renderPlaceholder("Tools", "Tool resources and policy controls will be managed here.")}
        </main>
      </div>
    </div>
  );
}
