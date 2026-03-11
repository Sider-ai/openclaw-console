import { useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

import type { PluginInstallResult, WeComAppChannel } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code } from "@/components/code";

type WeComAppForm = {
  enabled: boolean;
  corpId: string;
  corpSecret: string;
  agentId: string;
  token: string;
  encodingAesKey: string;
  webhookPath: string;
  apiBaseUrl: string;
  dmPolicy: string;
  allowFrom: string[];
  welcomeText: string;
};

type WeComAppChannelPageProps = {
  channel: WeComAppChannel | null;
  form: WeComAppForm;
  installResult: PluginInstallResult | null;
  isDirty: boolean;
  loading: boolean;
  onDisconnect: () => Promise<void>;
  onFormChange: Dispatch<SetStateAction<WeComAppForm>>;
  onInstallPlugin: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSave: () => Promise<void>;
};

const WECOM_DOCS_URL = "https://github.com/BytePioneer-AI/openclaw-china";
const WECOM_FULL_GUIDE_URL = "https://github.com/BytePioneer-AI/openclaw-china/blob/main/doc/guides/wecom-app/configuration.md";
const DEFAULT_WECOM_WEBHOOK_PATH = "/wecom-app";

function normalizeWebhookPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_WECOM_WEBHOOK_PATH;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function WeComAppChannelPage({
  channel,
  form,
  installResult,
  isDirty,
  loading,
  onDisconnect,
  onFormChange,
  onInstallPlugin,
  onRefresh,
  onSave
}: WeComAppChannelPageProps) {
  const [allowFromDraft, setAllowFromDraft] = useState("");
  const pluginInstalled = channel?.pluginInstalled === true;
  const statusLabel = pluginInstalled ? (channel?.configured ? "Configured" : "Not Configured") : "Plugin Not Installed";
  const isConnected = pluginInstalled && channel?.configured;
  const effectiveWebhookPath = normalizeWebhookPath(form.webhookPath || channel?.webhookPath || "");
  const callbackURL = typeof window === "undefined" ? effectiveWebhookPath : `http://${window.location.hostname}:18789${effectiveWebhookPath}`;

  function appendAllowFromValues(raw: string) {
    const values = raw
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length === 0) {
      return;
    }
    onFormChange((prev) => ({
      ...prev,
      allowFrom: [...prev.allowFrom, ...values].filter((value, index, all) => all.indexOf(value) === index)
    }));
    setAllowFromDraft("");
  }

  function removeAllowFromValue(value: string) {
    onFormChange((prev) => ({
      ...prev,
      allowFrom: prev.allowFrom.filter((item) => item !== value)
    }));
  }

  function handleAllowFromKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }
    event.preventDefault();
    appendAllowFromValues(allowFromDraft);
  }

  return (
    <>
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">WeCom App</CardTitle>
              <CardDescription className="mt-1">Connect OpenClaw to WeCom (企业微信自建应用) through the community plugin. This is not a built-in OpenClaw channel.</CardDescription>
            </div>
            <a href={WECOM_DOCS_URL} rel="noreferrer" target="_blank" className="text-sm text-primary">
              Open Plugin Docs
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              {isConnected ? (
                <Badge variant="success" className="transition-colors duration-150">{statusLabel}</Badge>
              ) : (
                <Badge variant="secondary" className="transition-colors duration-150">{statusLabel}</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Plugin</span>
              <span className="text-sm text-muted-foreground">
                {pluginInstalled
                  ? `${channel?.pluginSpec || "wecom-app"}${channel?.pluginVersion ? ` (${channel.pluginVersion})` : ""}`
                  : channel?.pluginSpec || "@openclaw-china/wecom-app"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {!pluginInstalled ? (
        <>
          <Card className="shadow-sm ring-1 ring-border/60">
            <CardHeader>
              <CardTitle className="text-base">Install Plugin</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-1">WeCom App support comes from the community plugin <Code>{channel?.pluginSpec || "@openclaw-china/wecom-app"}</Code>. Installing it lets OpenClaw expose the <Code>wecom-app</Code> channel.</p>
              <p className="text-sm text-muted-foreground mb-4">This action installs and runs third-party code inside OpenClaw. Review the plugin before installing it in production.</p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={loading} onClick={() => void onInstallPlugin()} type="button">
                  Install WeCom App Plugin
                </Button>
                <Button variant="outline" disabled={loading} onClick={() => void onRefresh()} type="button">
                  Refresh
                </Button>
              </div>
              {installResult?.output && (
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium text-sm select-none">Install Output</summary>
                  <pre className="mt-3 font-mono text-xs bg-muted/50 rounded-xl p-4 border border-border/50 overflow-auto">{installResult.output}</pre>
                </details>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-1 ring-border/60">
            <CardHeader>
              <CardTitle className="text-base">Before You Install</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  Open the{" "}
                  <a href="https://work.weixin.qq.com/" rel="noreferrer" target="_blank" className="text-primary">
                    WeCom Admin Console
                  </a>{" "}
                  and create a self-built application (自建应用).
                </li>
                <li>
                  Review the{" "}
                  <a href={WECOM_DOCS_URL} rel="noreferrer" target="_blank" className="text-primary">
                    plugin documentation
                  </a>{" "}
                  to understand required credentials and callback setup.
                </li>
                <li>Install the plugin here, then come back to fill in the configuration fields.</li>
              </ol>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="shadow-sm ring-1 ring-border/60">
            <CardHeader>
              <CardTitle className="text-base">Before you start</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>You will need these prerequisites before the setup below will work:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>A self-built WeCom application already exists in the WeCom Admin Console.</li>
                  <li>You have the <Code>Corp ID</Code>, <Code>Corp Secret</Code>, <Code>Agent ID</Code>, <Code>Token</Code>, and <Code>EncodingAESKey</Code>.</li>
                  <li>The server public IP has been added to the WeCom trusted IP allowlist.</li>
                </ul>
                <p>
                  If you have not created the application yet, start with the{" "}
                  <a href={WECOM_FULL_GUIDE_URL} rel="noreferrer" target="_blank" className="text-primary">
                    full WeCom App guide
                  </a>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-1 ring-border/60">
            <CardHeader>
              <CardTitle className="text-base">Quick setup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-none">
                  <CardContent className="p-4">
                    <strong className="font-semibold">1. Install plugin</strong>
                    <p className="text-sm text-muted-foreground mt-1">Keep the community plugin installed, then refresh this page if you changed anything outside the console.</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardContent className="p-4">
                    <strong className="font-semibold">2. Fill credentials</strong>
                    <p className="text-sm text-muted-foreground mt-1">Enter the WeCom application credentials below. Leave secret fields blank if you want to keep the saved values.</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardContent className="p-4">
                    <strong className="font-semibold">3. Configure callback</strong>
                    <p className="text-sm text-muted-foreground mt-1">Use <Code>{callbackURL}</Code> in WeCom Admin and keep the webhook path aligned with <Code>{effectiveWebhookPath}</Code>.</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardContent className="p-4">
                    <strong className="font-semibold">4. Save and verify</strong>
                    <p className="text-sm text-muted-foreground mt-1">Save the configuration here, then save the callback settings in WeCom Admin and send a test message.</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-1 ring-border/60">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle className="text-base">Configuration</CardTitle>
                <Button variant="outline" disabled={loading} onClick={() => void onRefresh()} type="button">
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p>Recommended callback URL: <Code>{callbackURL}</Code></p>
                <p className="mt-2">The default webhook path is <Code>{DEFAULT_WECOM_WEBHOOK_PATH}</Code>. If you change it here, update the same path in WeCom Admin.</p>
              </div>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enable WeCom App</Label>
                  <p className="text-sm text-muted-foreground">Turn the WeCom App channel on after the plugin is installed and configured.</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox
                      id="wecom-enabled"
                      checked={form.enabled}
                      onCheckedChange={(checked) => onFormChange((prev) => ({ ...prev, enabled: checked === true }))}
                    />
                    <Label htmlFor="wecom-enabled">Enabled</Label>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wecom-corp-id" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Corp ID</Label>
                  <p className="text-sm text-muted-foreground">The Corp ID (企业ID) from WeCom Admin Console.</p>
                  <Input
                    id="wecom-corp-id"
                    className="max-w-md transition-colors duration-150"
                    onChange={(event) => onFormChange((prev) => ({ ...prev, corpId: event.target.value }))}
                    placeholder="ww..."
                    type="text"
                    value={form.corpId}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wecom-corp-secret" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Corp Secret</Label>
                  <p className="text-sm text-muted-foreground">The application secret. Leave blank to keep the already saved secret.</p>
                  <Input
                    id="wecom-corp-secret"
                    className="max-w-md transition-colors duration-150"
                    onChange={(event) => onFormChange((prev) => ({ ...prev, corpSecret: event.target.value }))}
                    placeholder="Paste Corp Secret"
                    type="password"
                    value={form.corpSecret}
                  />
                  {channel?.corpSecretConfigured && <p className="text-xs text-muted-foreground">A Corp Secret is already saved in OpenClaw.</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wecom-agent-id" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent ID</Label>
                  <p className="text-sm text-muted-foreground">The Agent ID (应用AgentId) of the self-built application.</p>
                  <Input
                    id="wecom-agent-id"
                    className="max-w-md transition-colors duration-150"
                    onChange={(event) => onFormChange((prev) => ({ ...prev, agentId: event.target.value }))}
                    placeholder="1000002"
                    type="text"
                    value={form.agentId}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wecom-token" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Token</Label>
                  <p className="text-sm text-muted-foreground">The Token from the API callback settings. Leave blank to keep the already saved value.</p>
                  <Input
                    id="wecom-token"
                    className="max-w-md transition-colors duration-150"
                    onChange={(event) => onFormChange((prev) => ({ ...prev, token: event.target.value }))}
                    placeholder="Paste Token"
                    type="password"
                    value={form.token}
                  />
                  {channel?.tokenConfigured && <p className="text-xs text-muted-foreground">A Token is already saved in OpenClaw.</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wecom-encoding-aes-key" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">EncodingAESKey</Label>
                  <p className="text-sm text-muted-foreground">The EncodingAESKey from the API callback settings. Leave blank to keep the already saved value.</p>
                  <Input
                    id="wecom-encoding-aes-key"
                    className="max-w-md transition-colors duration-150"
                    onChange={(event) => onFormChange((prev) => ({ ...prev, encodingAesKey: event.target.value }))}
                    placeholder="Paste EncodingAESKey"
                    type="password"
                    value={form.encodingAesKey}
                  />
                  {channel?.encodingAesKeyConfigured && <p className="text-xs text-muted-foreground">An EncodingAESKey is already saved in OpenClaw.</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wecom-webhook-path" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Webhook Path</Label>
                  <p className="text-sm text-muted-foreground">Webhook endpoint path. The official guide uses <Code>{DEFAULT_WECOM_WEBHOOK_PATH}</Code>.</p>
                  <Input
                    id="wecom-webhook-path"
                    className="max-w-md transition-colors duration-150"
                    onChange={(event) => onFormChange((prev) => ({ ...prev, webhookPath: event.target.value }))}
                    placeholder={DEFAULT_WECOM_WEBHOOK_PATH}
                    type="text"
                    value={form.webhookPath}
                  />
                  <p className="text-xs text-muted-foreground">Effective callback URL: <Code>{callbackURL}</Code></p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wecom-api-base-url" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">API Base URL</Label>
                  <p className="text-sm text-muted-foreground">Optional. Override the WeCom API base URL for proxy or enterprise deployments.</p>
                  <Input
                    id="wecom-api-base-url"
                    className="max-w-md transition-colors duration-150"
                    onChange={(event) => onFormChange((prev) => ({ ...prev, apiBaseUrl: event.target.value }))}
                    placeholder="https://qyapi.weixin.qq.com"
                    type="url"
                    value={form.apiBaseUrl}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DM Policy</Label>
                  <p className="text-sm text-muted-foreground">Controls who can send direct messages to the bot.</p>
                  <div className="flex flex-col gap-2 mt-1">
                    {(["open", "allowlist", "disabled"] as const).map((policy) => (
                      <div key={policy} className="flex items-center gap-2">
                        <input
                          type="radio"
                          id={`dm-policy-${policy}`}
                          name="dmPolicy"
                          value={policy}
                          checked={form.dmPolicy === policy}
                          onChange={() => onFormChange((prev) => ({ ...prev, dmPolicy: policy }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={`dm-policy-${policy}`}>
                          {policy === "open"
                            ? "Open (anyone)"
                            : policy === "allowlist"
                                ? "Allowlist"
                                : "Disabled"}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Allow From</Label>
                  <p className="text-sm text-muted-foreground">Allowed WeCom users. Add one user ID at a time. Use <Code>*</Code> to allow everyone.</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Input
                        className="max-w-xs transition-colors duration-150"
                        onChange={(event) => setAllowFromDraft(event.target.value)}
                        onKeyDown={handleAllowFromKeyDown}
                        placeholder="WeCom user ID or *"
                        type="text"
                        value={allowFromDraft}
                      />
                      <Button variant="outline" disabled={!allowFromDraft.trim() || loading} onClick={() => appendAllowFromValues(allowFromDraft)} type="button">
                        Add User ID
                      </Button>
                    </div>
                    {form.allowFrom.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {form.allowFrom.map((value) => (
                          <Badge key={value} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                            <span>{value}</span>
                            <button
                              onClick={() => removeAllowFromValue(value)}
                              type="button"
                              className="ml-1 rounded-sm hover:text-destructive focus:outline-none"
                              aria-label={`Remove ${value}`}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No allowed users added yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wecom-welcome-text" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Welcome Text</Label>
                  <p className="text-sm text-muted-foreground">Optional. A message sent when a new user starts chatting with the bot.</p>
                  <Input
                    id="wecom-welcome-text"
                    className="max-w-md transition-colors duration-150"
                    onChange={(event) => onFormChange((prev) => ({ ...prev, welcomeText: event.target.value }))}
                    placeholder="Welcome message..."
                    type="text"
                    value={form.welcomeText}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button disabled={loading || !isDirty || !form.corpId.trim() || !form.agentId.trim()} onClick={() => void onSave()} type="button">
                    Save Configuration
                  </Button>
                  <Button variant="destructive" disabled={loading || !channel?.configured} onClick={() => void onDisconnect()} type="button">
                    Remove Configuration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm ring-1 ring-border/60">
            <CardHeader>
              <CardTitle className="text-base">Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>If callback validation fails, confirm the URL in WeCom Admin is exactly <Code>{callbackURL}</Code>.</li>
                <li>If WeCom reports the callback is unreachable, re-check the trusted IP allowlist and external access to the gateway.</li>
                <li>If validation still fails after saving, re-enter the <Code>Token</Code> and <Code>EncodingAESKey</Code> from WeCom Admin and save again here.</li>
                <li>After callback validation succeeds, send a direct message to the application to confirm the bot can receive and reply.</li>
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
