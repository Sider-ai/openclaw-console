import { providerDocsURL } from "../lib/navigation";
import type { CodexSession, Provider } from "../lib/types";

type OpenAIProviderPageProps = {
  apiKey: string;
  codexProvider: Provider | null;
  codexSession: CodexSession | null;
  inProgress: boolean;
  loading: boolean;
  onApiKeyChange: (value: string) => void;
  onCancelSession: () => Promise<void>;
  onConnectAPIKey: () => void;
  onDisconnectCodex: () => void;
  onDisconnectOpenAI: () => void;
  onRedirectURLChange: (value: string) => void;
  onStartSession: () => Promise<void>;
  onSubmitRedirect: () => Promise<void>;
  openaiProvider: Provider | null;
  redirectURL: string;
};

function providerConnectionLabel(provider: Provider | null): "Connected" | "Not Configured" {
  return provider?.connection === "CONNECTED" ? "Connected" : "Not Configured";
}

function providerConnectionClass(provider: Provider | null): string {
  return provider?.connection === "CONNECTED" ? "status-badge status-badge-connected" : "status-badge status-badge-disconnected";
}

export function OpenAIProviderPage({
  apiKey,
  codexProvider,
  codexSession,
  inProgress,
  loading,
  onApiKeyChange,
  onCancelSession,
  onConnectAPIKey,
  onDisconnectCodex,
  onDisconnectOpenAI,
  onRedirectURLChange,
  onStartSession,
  onSubmitRedirect,
  openaiProvider,
  redirectURL
}: OpenAIProviderPageProps) {
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
          <input placeholder="sk-..." value={apiKey} onChange={(e) => onApiKeyChange(e.target.value)} />
          <button className="btn" onClick={onConnectAPIKey} disabled={loading || !apiKey.trim() || openaiProvider?.supportsApiKey !== true}>
            Connect API Key
          </button>
          <button className="btn btn-warn" onClick={onDisconnectOpenAI} disabled={loading || openaiProvider?.connection !== "CONNECTED"}>
            Disconnect
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>OpenAI Codex Subscription</h2>
        <div className="form-row compact">
          <button className="btn" onClick={() => void onStartSession()} disabled={loading || inProgress}>
            Start Session
          </button>
          <button className="btn btn-warn" onClick={() => void onCancelSession()} disabled={loading || !codexSession}>
            Cancel Session
          </button>
          <button className="btn btn-warn" onClick={onDisconnectCodex} disabled={loading || codexProvider?.connection !== "CONNECTED"}>
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
              onChange={(e) => onRedirectURLChange(e.target.value)}
            />
            <div className="form-row compact">
              <button className="btn" onClick={() => void onSubmitRedirect()} disabled={loading || !redirectURL.trim()}>
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
