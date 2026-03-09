import { ExternalLink } from "lucide-react";
import { providerDocsURL } from "../lib/navigation";
import type { CodexSession, Provider } from "../lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">OpenAI Provider</CardTitle>
            <a href={providerDocsURL("openai")} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">
              Docs
            </a>
          </div>
          <CardDescription>OpenAI provides two auth methods in OpenClaw Console: API Key and Codex subscription.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="text-base">Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="text-base">OpenAI API Key</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="text-base">OpenAI Codex Subscription</CardTitle>
        </CardHeader>
        <CardContent>
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
                <Alert className="mt-3 border-amber-500/40 bg-amber-50 dark:bg-amber-950/30">
                  <AlertDescription>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      Please open the link below to log in with OpenAI. If the browser did not open automatically, click the button.
                    </p>
                    <a href={codexSession.authUrl} target="_blank" rel="noreferrer">
                      <Button type="button" variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 gap-1.5">
                        <ExternalLink className="h-4 w-4" />
                        Open OpenAI Login URL
                      </Button>
                    </a>
                  </AlertDescription>
                </Alert>
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
        </CardContent>
      </Card>
    </>
  );
}
