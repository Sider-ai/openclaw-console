import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

type ModelSetting = {
  name: string;
  defaultModel: string;
};

type Provider = {
  name: string;
  providerId: string;
  supportsApiKey: boolean;
  connection: string;
  authType: string;
  profileLabels?: string[];
};

type ProviderSummary = {
  name: string;
  providerId: string;
  displayName: string;
  supportsApiKey: boolean;
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

const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE || "/api").replace(/\/$/, "");
const DOCS_PROVIDER_ROOT = "https://docs.openclaw.ai/providers";

const ROOT_NAV_ITEMS: { key: Exclude<NavKey, "models">; label: string; path: string }[] = [
  { key: "agents", label: "Agents", path: "/agents" },
  { key: "channels", label: "Channels", path: "/channels" },
  { key: "tools", label: "Tools", path: "/tools" }
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

  return out;
}

function providerDocsURL(provider: string): string {
  if (provider === "openai") {
    return `${DOCS_PROVIDER_ROOT}/openai`;
  }
  return DOCS_PROVIDER_ROOT;
}

function providerRouteFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/models\/providers\/([^/]+)\/?$/);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

function navFromPath(pathname: string): NavKey {
  if (pathname.startsWith("/agents")) {
    return "agents";
  }
  if (pathname.startsWith("/channels")) {
    return "channels";
  }
  if (pathname.startsWith("/tools")) {
    return "tools";
  }
  return "models";
}

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
    throw new Error((data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`);
  }
  return data as T;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const providerRoute = providerRouteFromPath(location.pathname);
  const activeNav = navFromPath(location.pathname);

  const [modelsExpanded, setModelsExpanded] = useState(activeNav === "models");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modelSetting, setModelSetting] = useState<ModelSetting | null>(null);
  const [providerSummaries, setProviderSummaries] = useState<ProviderSummary[]>([]);
  const [providerNav, setProviderNav] = useState<ModelProviderNav[]>([]);

  const [openaiProvider, setOpenaiProvider] = useState<Provider | null>(null);
  const [codexProvider, setCodexProvider] = useState<Provider | null>(null);
  const [providerStatus, setProviderStatus] = useState<Provider | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [defaultModelInput, setDefaultModelInput] = useState("");
  const [defaultModelUnavailable, setDefaultModelUnavailable] = useState("");
  const [modelOptions, setModelOptions] = useState<CatalogEntry[]>([]);

  const [codexSession, setCodexSession] = useState<CodexSession | null>(null);
  const [redirectURL, setRedirectURL] = useState("");

  useEffect(() => {
    if (activeNav === "models") {
      setModelsExpanded(true);
    }
  }, [activeNav]);

  const inProgress = useMemo(() => {
    if (!codexSession) {
      return false;
    }
    return ["LAUNCHING_ONBOARD", "AWAITING_REDIRECT_URL", "EXCHANGING_TOKEN", "MERGING_CREDENTIALS", "RESTARTING_SERVICE"].includes(
      codexSession.state
    );
  }, [codexSession]);

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
      setApiKey("");
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

  function renderModelDefaultsWorkspace() {
    return (
      <>
        <section className="panel">
          <h2>Models</h2>
          <p className="muted">Set the global default model used by OpenClaw from available catalog entries.</p>
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h2>Default Model</h2>
            <button className="btn btn-secondary" onClick={() => void refresh()} disabled={loading}>
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
            <button className="btn" onClick={() => void updateDefaultModel()} disabled={loading || !defaultModelInput.trim() || modelOptions.length === 0}>
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
      </>
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
            <button
              className="btn"
              onClick={() => {
                void connectAPIKey("openai");
              }}
              disabled={loading || !apiKey.trim() || openaiProvider?.supportsApiKey !== true}
            >
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
            <button className="btn" onClick={() => void startCodexSession()} disabled={loading || inProgress}>
              Start Session
            </button>
            <button className="btn btn-warn" onClick={() => void cancelSession()} disabled={loading || !codexSession}>
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
                <button className="btn" onClick={() => void submitRedirect()} disabled={loading || !redirectURL.trim()}>
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

  function renderReadOnlyProviderWorkspace(providerID: string) {
    const supportsAPIKey = providerStatus?.supportsApiKey === true;
    const activeProviderLabel = providerNav.find((item) => item.id === providerID)?.label || fallbackProviderLabel(providerID);

    return (
      <>
        <section className="panel">
          <div className="panel-title-row">
            <h2>{activeProviderLabel} Provider</h2>
            <a href={providerDocsURL(providerID)} target="_blank" rel="noreferrer">
              Docs
            </a>
          </div>
          <p className="muted">
            {supportsAPIKey ? "Configure API key authentication for this provider." : "This provider page is read-only for now. You can view provider status."}
          </p>
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

        {supportsAPIKey && (
          <section className="panel">
            <h2>{activeProviderLabel} API Key</h2>
            <div className="form-row">
              <input placeholder="Provider API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <button
                className="btn"
                onClick={() => {
                  void connectAPIKey(providerID);
                }}
                disabled={loading || !apiKey.trim()}
              >
                Connect API Key
              </button>
              <button
                className="btn btn-warn"
                onClick={() => {
                  void disconnectProvider(providerID);
                }}
                disabled={loading || providerStatus?.connection !== "CONNECTED"}
              >
                Disconnect
              </button>
            </div>
          </section>
        )}
      </>
    );
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
                className={activeNav === item.key ? "nav-item nav-item-active" : "nav-item"}
                onClick={() => navigate(item.path)}
                type="button"
              >
                {item.label}
              </button>
            ))}

            <div className="nav-group">
              <button
                className={activeNav === "models" ? "nav-item nav-item-active" : "nav-item"}
                onClick={() => {
                  if (activeNav === "models") {
                    setModelsExpanded((prev) => !prev);
                  } else {
                    navigate("/models");
                    setModelsExpanded(true);
                  }
                }}
                type="button"
              >
                <span>Models</span>
                <span className="nav-caret">{modelsExpanded ? "v" : ">"}</span>
              </button>

              {modelsExpanded && (
                <div className="subnav-list">
                  <button
                    className={location.pathname === "/models" ? "subnav-item subnav-item-active" : "subnav-item"}
                    onClick={() => navigate("/models")}
                    type="button"
                  >
                    Default Model
                  </button>
                  {providerNav.map((item) => (
                    <button
                      key={item.id}
                      className={providerRoute === item.id ? "subnav-item subnav-item-active" : "subnav-item"}
                      onClick={() => navigate(`/models/providers/${encodeURIComponent(item.id)}`)}
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

          <Routes>
            <Route path="/" element={<Navigate to="/models" replace />} />
            <Route path="/models" element={renderModelDefaultsWorkspace()} />
            <Route path="/models/providers/openai" element={renderOpenAIWorkspace()} />
            <Route
              path="/models/providers/:providerId"
              element={providerRoute && providerRoute !== "openai" ? renderReadOnlyProviderWorkspace(providerRoute) : <Navigate to="/models" replace />}
            />
            <Route
              path="/agents"
              element={renderPlaceholder("Agents", "Agent resources will be managed here. API hooks can be added in the next iteration.")}
            />
            <Route
              path="/channels"
              element={renderPlaceholder("Channels", "Channel resources (Telegram, Slack, etc.) will be configured here.")}
            />
            <Route
              path="/tools"
              element={renderPlaceholder("Tools", "Tool resources and policy controls will be managed here.")}
            />
            <Route path="*" element={<Navigate to="/models" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
