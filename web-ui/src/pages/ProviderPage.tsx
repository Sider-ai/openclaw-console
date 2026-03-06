import { fallbackProviderLabel, providerDocsURL } from "../lib/navigation";
import type { ModelProviderNav, Provider } from "../lib/types";

type ProviderPageProps = {
  apiKey: string;
  loading: boolean;
  onApiKeyChange: (value: string) => void;
  onConnectAPIKey: () => void;
  onDisconnect: () => void;
  providerID: string;
  providerNav: ModelProviderNav[];
  providerStatus: Provider | null;
};

function providerConnectionLabel(provider: Provider | null): "Connected" | "Not Configured" {
  return provider?.connection === "CONNECTED" ? "Connected" : "Not Configured";
}

function providerConnectionClass(provider: Provider | null): string {
  return provider?.connection === "CONNECTED" ? "status-badge status-badge-connected" : "status-badge status-badge-disconnected";
}

export function ProviderPage({
  apiKey,
  loading,
  onApiKeyChange,
  onConnectAPIKey,
  onDisconnect,
  providerID,
  providerNav,
  providerStatus
}: ProviderPageProps) {
  const activeProviderLabel = providerNav.find((item) => item.id === providerID)?.label || fallbackProviderLabel(providerID);
  const supportsAPIKey = providerStatus?.supportsApiKey === true;

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
            <input placeholder="Provider API key" value={apiKey} onChange={(e) => onApiKeyChange(e.target.value)} />
            <button className="btn" onClick={onConnectAPIKey} disabled={loading || !apiKey.trim()}>
              Connect API Key
            </button>
            <button className="btn btn-warn" onClick={onDisconnect} disabled={loading || providerStatus?.connection !== "CONNECTED"}>
              Disconnect
            </button>
          </div>
        </section>
      )}
    </>
  );
}
