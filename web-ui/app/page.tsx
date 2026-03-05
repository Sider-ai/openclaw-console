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

type CatalogEntry = {
  name: string;
  modelKey: string;
  displayName: string;
  provider: string;
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

const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_BASE || "http://localhost:18080";

const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: "agents", label: "Agents" },
  { key: "channels", label: "Channels" },
  { key: "tools", label: "Tools" },
  { key: "models", label: "Models" }
];

export default function Page() {
  const [activeNav, setActiveNav] = useState<NavKey>("models");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modelSetting, setModelSetting] = useState<ModelSetting | null>(null);
  const [openaiProvider, setOpenaiProvider] = useState<Provider | null>(null);
  const [codexProvider, setCodexProvider] = useState<Provider | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [defaultModelInput, setDefaultModelInput] = useState("");

  const [providerFilter, setProviderFilter] = useState("openai");
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);

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
      const [setting, openai, codex, models] = await Promise.all([
        api<ModelSetting>("/v1/modelSettings/default"),
        api<Provider>("/v1/providers/openai"),
        api<Provider>("/v1/providers/openai-codex"),
        api<{ modelCatalogEntries: CatalogEntry[] }>(`/v1/modelCatalogEntries?provider=${providerFilter}`)
      ]);
      setModelSetting(setting);
      setDefaultModelInput(setting.defaultModel || "");
      setOpenaiProvider(openai);
      setCodexProvider(codex);
      setCatalog(models.modelCatalogEntries || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [providerFilter]);

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

  async function updateDefaultModel() {
    setLoading(true);
    setError("");
    try {
      const res = await api<ModelSetting>("/v1/modelSettings/default?update_mask=default_model", {
        method: "PATCH",
        body: JSON.stringify({ defaultModel: defaultModelInput })
      });
      setModelSetting(res);
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

  function renderModelsWorkspace() {
    return (
      <>
        <section className="panel">
          <div className="panel-title-row">
            <h2>Model Defaults</h2>
            <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>
          <div className="form-row">
            <input value={defaultModelInput} onChange={(e) => setDefaultModelInput(e.target.value)} placeholder="openai/gpt-5" />
            <button className="btn" onClick={updateDefaultModel} disabled={loading || !defaultModelInput.trim()}>
              Set Default Model
            </button>
          </div>
          <p className="muted">Resource: {modelSetting?.name || "modelSettings/default"}</p>
        </section>

        <section className="panel">
          <h2>Provider Status</h2>
          <pre>{JSON.stringify({ openai: openaiProvider, openaiCodex: codexProvider }, null, 2)}</pre>
        </section>

        <section className="panel">
          <h2>OpenAI API Key</h2>
          <div className="form-row">
            <input placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <button className="btn" onClick={connectAPIKey} disabled={loading || !apiKey.trim()}>
              Connect API Key
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Codex Subscription OAuth</h2>
          <div className="form-row compact">
            <button className="btn" onClick={startCodexSession} disabled={loading || inProgress}>
              Start Session
            </button>
            <button className="btn btn-warn" onClick={cancelSession} disabled={loading || !codexSession}>
              Cancel Session
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

        <section className="panel">
          <div className="panel-title-row">
            <h2>Model Catalog Entries</h2>
            <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
              <option value="openai">openai</option>
              <option value="openai-codex">openai-codex</option>
            </select>
          </div>
          <pre>{JSON.stringify(catalog, null, 2)}</pre>
        </section>
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
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={item.key === activeNav ? "nav-item nav-item-active" : "nav-item"}
                onClick={() => setActiveNav(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
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
