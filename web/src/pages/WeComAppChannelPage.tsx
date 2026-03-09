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

const WECOM_DOCS_URL = "https://github.com/openclaw-china/wecom-app";

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
            <a href={WECOM_DOCS_URL} rel="noreferrer" target="_blank" className="text-sm text-primary underline-offset-4 hover:underline">
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
                  <a href="https://work.weixin.qq.com/" rel="noreferrer" target="_blank" className="text-primary underline-offset-4 hover:underline">
                    WeCom Admin Console
                  </a>{" "}
                  and create a self-built application (自建应用).
                </li>
                <li>
                  Review the{" "}
                  <a href={WECOM_DOCS_URL} rel="noreferrer" target="_blank" className="text-primary underline-offset-4 hover:underline">
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
              <CardTitle className="text-base">Quick setup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-none">
                  <CardContent className="p-4">
                    <strong className="font-semibold">1. Create a WeCom App</strong>
                    <p className="text-sm text-muted-foreground mt-1">Log in to the WeCom Admin Console and create a self-built application. Note down the Corp ID, Corp Secret, and Agent ID.</p>
                    <p className="mt-2">
                      <a href="https://work.weixin.qq.com/" rel="noreferrer" target="_blank" className="text-sm text-primary underline-offset-4 hover:underline">
                        Open WeCom Admin
                      </a>
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardContent className="p-4">
                    <strong className="font-semibold">2. Configure callback</strong>
                    <p className="text-sm text-muted-foreground mt-1">Set up the API callback URL in the WeCom Admin Console. You will need the <Code>Token</Code> and <Code>EncodingAESKey</Code> from the callback settings.</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardContent className="p-4">
                    <strong className="font-semibold">3. Fill in credentials</strong>
                    <p className="text-sm text-muted-foreground mt-1">Enter all required credentials below, save, and send a test message from WeCom to verify the integration.</p>
                    <p className="mt-2">
                      <a href={WECOM_DOCS_URL} rel="noreferrer" target="_blank" className="text-sm text-primary underline-offset-4 hover:underline">
                        Open Plugin Guide
                      </a>
                    </p>
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
                  <p className="text-sm text-muted-foreground">Optional. Custom path for the webhook endpoint.</p>
                  <Input
                    id="wecom-webhook-path"
                    className="max-w-md transition-colors duration-150"
                    onChange={(event) => onFormChange((prev) => ({ ...prev, webhookPath: event.target.value }))}
                    placeholder="/webhook/wecom"
                    type="text"
                    value={form.webhookPath}
                  />
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
                        <Label htmlFor={`dm-policy-${policy}`}>{policy === "open" ? "Open (anyone)" : policy === "allowlist" ? "Allowlist" : "Disabled"}</Label>
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
              <CardTitle className="text-base">How To Verify It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Save the configuration on this page.</li>
                <li>Ensure the API callback URL is correctly configured in the WeCom Admin Console.</li>
                <li>Send a direct message to the application from WeCom to confirm the bot can receive and reply.</li>
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
