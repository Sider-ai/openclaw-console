import { providerDocsURL } from "../lib/navigation";
import type { CodexSession, Provider } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";

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
      <section className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-border/60">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold tracking-tight">OpenAI Provider</h2>
          <a href={providerDocsURL("openai")} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">
            Docs
          </a>
        </div>
        <Separator className="mb-3" />
        <p className="text-sm text-muted-foreground">OpenAI provides two auth methods in OpenClaw Console: API Key and Codex subscription.</p>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-border/60">
        <h2 className="text-base font-semibold tracking-tight mb-2">Provider Status</h2>
        <Separator className="mb-4" />
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">OpenAI API Key</span>
            <ProviderStatusBadge provider={openaiProvider} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">OpenAI Codex Subscription</span>
            <ProviderStatusBadge provider={codexProvider} />
          </div>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">Advanced: Raw Provider Status</summary>
          <pre className="mt-2 font-mono text-xs bg-muted/50 rounded-xl p-4 border border-border/50 overflow-auto">{JSON.stringify({ openai: openaiProvider, openaiCodex: codexProvider }, null, 2)}</pre>
        </details>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-border/60">
        <h2 className="text-base font-semibold tracking-tight mb-2">OpenAI API Key</h2>
        <Separator className="mb-4" />
        <div className="flex flex-wrap gap-3 items-end">
          <Input
            className="w-[300px]"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
          />
          <Button onClick={onConnectAPIKey} disabled={loading || !apiKey.trim() || openaiProvider?.supportsApiKey !== true}>
            Connect API Key
          </Button>
          <Button variant="destructive" onClick={onDisconnectOpenAI} disabled={loading || openaiProvider?.connection !== "CONNECTED"}>
            Disconnect
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-border/60">
        <h2 className="text-base font-semibold tracking-tight mb-2">OpenAI Codex Subscription</h2>
        <Separator className="mb-4" />
        <div className="flex flex-wrap gap-3 items-end">
          <Button onClick={() => void onStartSession()} disabled={loading || inProgress}>
            Start Session
          </Button>
          <Button variant="destructive" onClick={() => void onCancelSession()} disabled={loading || !codexSession}>
            Cancel Session
          </Button>
          <Button variant="destructive" onClick={onDisconnectCodex} disabled={loading || codexProvider?.connection !== "CONNECTED"}>
            Disconnect
          </Button>
        </div>

        {codexSession && (
          <>
            <p className="mt-4 text-sm">
              State:{" "}
              <span className={codexSession.state === "SUCCEEDED" ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                {codexSession.state}
              </span>
            </p>
            {codexSession.authUrl && (
              <p className="mt-2 text-sm">
                <a href={codexSession.authUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                  Open OpenAI Login URL
                </a>
              </p>
            )}
            <Textarea
              className="mt-3"
              placeholder="Paste redirect URL from browser address bar"
              value={redirectURL}
              onChange={(e) => onRedirectURLChange(e.target.value)}
            />
            <div className="flex flex-wrap gap-3 items-end mt-3">
              <Button onClick={() => void onSubmitRedirect()} disabled={loading || !redirectURL.trim()}>
                Submit Redirect URL
              </Button>
            </div>
            <pre className="mt-3 font-mono text-xs bg-muted/50 rounded-xl p-4 border border-border/50 overflow-auto">{JSON.stringify(codexSession, null, 2)}</pre>
          </>
        )}
      </section>
    </>
  );
}
