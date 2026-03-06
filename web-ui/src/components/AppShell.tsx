import type { PropsWithChildren } from "react";
import type { NavigateFunction } from "react-router-dom";

import { ROOT_NAV_ITEMS } from "../lib/navigation";
import type { ModelProviderNav, NavKey } from "../lib/types";

type AppShellProps = PropsWithChildren<{
  activeNav: NavKey;
  apiBase: string;
  error: string;
  loading: boolean;
  modelsExpanded: boolean;
  onNavigate: NavigateFunction;
  onToggleModels: () => void;
  providerNav: ModelProviderNav[];
  providerRoute: string | null;
}>;

export function AppShell({
  activeNav,
  apiBase,
  children,
  error,
  loading,
  modelsExpanded,
  onNavigate,
  onToggleModels,
  providerNav,
  providerRoute
}: AppShellProps) {
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
          <span className="muted">{apiBase}</span>
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
                onClick={() => onNavigate(item.path)}
                type="button"
              >
                {item.label}
              </button>
            ))}

            <div className="nav-group">
              <button
                className={activeNav === "models" ? "nav-item nav-item-active" : "nav-item"}
                onClick={onToggleModels}
                type="button"
              >
                <span>Models</span>
                <span className="nav-caret">{modelsExpanded ? "v" : ">"}</span>
              </button>

              {modelsExpanded && (
                <div className="subnav-list">
                  <button
                    className={providerRoute === null && activeNav === "models" ? "subnav-item subnav-item-active" : "subnav-item"}
                    onClick={() => onNavigate("/models")}
                    type="button"
                  >
                    Default Model
                  </button>
                  {providerNav.map((item) => (
                    <button
                      key={item.id}
                      className={providerRoute === item.id ? "subnav-item subnav-item-active" : "subnav-item"}
                      onClick={() => onNavigate(`/models/providers/${encodeURIComponent(item.id)}`)}
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
          {children}
        </main>
      </div>
    </div>
  );
}
