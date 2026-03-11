import { fallbackProviderLabel, providerDocsURL } from "../lib/navigation";
import type { ModelProviderNav, Provider } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";

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
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{activeProviderLabel} Provider</CardTitle>
            <a href={providerDocsURL(providerID)} target="_blank" rel="noreferrer" className="text-sm text-primary">
              Docs
            </a>
          </div>
          <CardDescription>
            {supportsAPIKey ? "Configure API key authentication for this provider." : "This provider page is read-only for now. You can view provider status."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="text-base">Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">{activeProviderLabel}</span>
            <ProviderStatusBadge provider={providerStatus} />
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">Advanced: Raw Provider Status</summary>
            <pre className="mt-2 font-mono text-xs bg-muted/50 rounded-xl p-4 border border-border/50 overflow-auto">{JSON.stringify(providerStatus, null, 2)}</pre>
          </details>
        </CardContent>
      </Card>

      {supportsAPIKey && (
        <Card className="shadow-sm ring-1 ring-border/60">
          <CardHeader>
            <CardTitle className="text-base">{activeProviderLabel} API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <Input
                className="w-[300px]"
                placeholder="Provider API key"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
              />
              <Button onClick={onConnectAPIKey} disabled={loading || !apiKey.trim()}>
                Connect API Key
              </Button>
              <Button variant="destructive" onClick={onDisconnect} disabled={loading || providerStatus?.connection !== "CONNECTED"}>
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
