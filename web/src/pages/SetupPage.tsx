import { Activity, CheckCircle2, Circle, ExternalLink, Loader2, Play, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { BuildInfo, CatalogEntry, ChannelSummary, GatewayStatus, ModelSetting } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SetupPageProps = {
  buildInfo: BuildInfo | null;
  modelOptions: CatalogEntry[];
  modelSetting: ModelSetting | null;
  channels: ChannelSummary[];
  providerLabel: (id: string) => string;
  loading: boolean;
  gatewayStatus: GatewayStatus | null;
  gatewayError: string;
  gatewayActionInProgress: boolean;
  onGatewayStart: () => void;
  onGatewayStop: () => void;
};

function StepIcon({ complete }: { complete: boolean }) {
  return complete ? (
    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
  ) : (
    <Circle className="h-5 w-5 text-muted-foreground/40" />
  );
}

function gatewayBadge(status: GatewayStatus | null) {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  if (status.healthy) return <Badge variant="success">Running</Badge>;
  if (status.runtime === "running") return <Badge className="border-transparent bg-amber-100 text-amber-800 shadow hover:bg-amber-100/80">Degraded</Badge>;
  return <Badge variant="destructive">Stopped</Badge>;
}

export function SetupPage({
  buildInfo,
  modelOptions,
  modelSetting,
  channels,
  providerLabel,
  loading,
  gatewayStatus,
  gatewayError,
  gatewayActionInProgress,
  onGatewayStart,
  onGatewayStop,
}: SetupPageProps) {
  const navigate = useNavigate();

  const installOk = buildInfo !== null;
  const connectedProviders = [...new Set(modelOptions.filter((m) => m.available).map((m) => m.provider))];
  const providerOk = connectedProviders.length > 0;
  const channelOk = true; // WebUI is always available

  const configuredChannels = channels.filter((ch) => ch.configured);
  const stepsRemaining = [installOk, providerOk, channelOk].filter((v) => !v).length;

  const isStopped = gatewayStatus != null && !gatewayStatus.healthy && gatewayStatus.runtime !== "running";
  const isRunning = gatewayStatus != null && gatewayStatus.runtime === "running";

  return (
    <>
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : stepsRemaining === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <Circle className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <CardTitle className="text-base">
                {loading ? "Checking setup…" : stepsRemaining === 0 ? "All set — OpenClaw is ready" : `${stepsRemaining} step(s) remaining`}
              </CardTitle>
              <CardDescription>
                Verify the minimum requirements for OpenClaw to operate.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step 1: Installation */}
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <StepIcon complete={installOk} />
            <div className="flex-1">
              <CardTitle className="text-base">1. OpenClaw Installation</CardTitle>
              <CardDescription>The openclaw CLI binary is available and the console can communicate with it.</CardDescription>
            </div>
            {installOk ? (
              <Badge variant="success">Installed</Badge>
            ) : (
              <Badge variant="secondary">Not Detected</Badge>
            )}
          </div>
        </CardHeader>
        {installOk && (
          <CardContent>
            <div className="grid gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Build revision</span>
                <span className="font-mono text-xs">{buildInfo?.revision ? buildInfo.revision.slice(0, 7) : "unknown"}</span>
              </div>
              {buildInfo?.time && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Build time</span>
                  <span className="text-xs">{buildInfo.time}</span>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Gateway Service Status */}
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">Gateway Service</CardTitle>
              <CardDescription>The OpenClaw gateway daemon that processes requests.</CardDescription>
            </div>
            {gatewayBadge(gatewayStatus)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5 text-sm">
            {gatewayStatus && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Runtime</span>
                  <span>{gatewayStatus.runtime || "unknown"}</span>
                </div>
                {gatewayStatus.service && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span>{gatewayStatus.service}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">RPC Probe</span>
                  <span>{gatewayStatus.rpcOk ? "OK" : "Failed"}</span>
                </div>
                {gatewayStatus.url && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">URL</span>
                    <span className="font-mono text-xs">{gatewayStatus.url}</span>
                  </div>
                )}
              </>
            )}
            {gatewayError && (
              <p className="text-sm text-destructive">{gatewayError}</p>
            )}
            <div className="mt-2 flex gap-2">
              {isStopped && (
                <Button size="sm" disabled={gatewayActionInProgress} onClick={onGatewayStart}>
                  {gatewayActionInProgress ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                  Start
                </Button>
              )}
              {isRunning && (
                <Button variant="outline" size="sm" disabled={gatewayActionInProgress} onClick={onGatewayStop}>
                  {gatewayActionInProgress ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Square className="mr-1.5 h-3.5 w-3.5" />}
                  Stop
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Model Provider */}
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <StepIcon complete={providerOk} />
            <div className="flex-1">
              <CardTitle className="text-base">2. Model Provider</CardTitle>
              <CardDescription>At least one model provider (e.g. Anthropic, OpenAI, Ollama) must be connected.</CardDescription>
            </div>
            {providerOk ? (
              <Badge variant="success">{connectedProviders.length} connected</Badge>
            ) : (
              <Badge className="border-transparent bg-amber-100 text-amber-800 shadow hover:bg-amber-100/80">Not Connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {providerOk ? (
            <div className="grid gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Connected providers</span>
                <span>{connectedProviders.map((p) => providerLabel(p)).join(", ")}</span>
              </div>
              {modelSetting?.defaultModel && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Default model</span>
                  <span className="font-mono text-xs">{modelSetting.defaultModel}</span>
                </div>
              )}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/models")}>
                  Manage Providers
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">No model providers detected. Connect one to get started.</span>
              <Button size="sm" onClick={() => navigate("/models")}>
                Configure
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Channel */}
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <StepIcon complete={channelOk} />
            <div className="flex-1">
              <CardTitle className="text-base">3. Channel</CardTitle>
              <CardDescription>At least one channel is needed to interact with OpenClaw. The built-in WebUI is always available.</CardDescription>
            </div>
            <Badge variant="success">Available</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Built-in WebUI</span>
              <a
                href="http://localhost:18789"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                localhost:18789
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {configuredChannels.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Additional channels</span>
                <span>{configuredChannels.map((ch) => ch.displayName).join(", ")}</span>
              </div>
            )}
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/channels")}>
                Manage Channels
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
