import { useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

import type { PluginInstallResult, QQBotChannel } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code } from "@/components/code";

type QQBotForm = {
  enabled: boolean;
  appId: string;
  clientSecret: string;
  allowFrom: string[];
  markdownSupport: boolean;
  imageServerBaseUrl: string;
};

type QQBotChannelPageProps = {
  channel: QQBotChannel | null;
  form: QQBotForm;
  installResult: PluginInstallResult | null;
  isDirty: boolean;
  loading: boolean;
  onDisconnect: () => Promise<void>;
  onFormChange: Dispatch<SetStateAction<QQBotForm>>;
  onInstallPlugin: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSave: () => Promise<void>;
};

const QQBOT_DOCS_URL = "https://github.com/sliverp/qqbot";
const QQBOT_OFFICIAL_URL = "https://q.qq.com/qqbot/openclaw/";

export function QQBotChannelPage({
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
}: QQBotChannelPageProps) {
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
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">QQ Bot</h2>
            <p className="text-sm text-muted-foreground">Connect OpenClaw to Tencent QQ Bot through the community plugin. This is not a built-in OpenClaw channel.</p>
          </div>
          <a href={QQBOT_DOCS_URL} rel="noreferrer" target="_blank" className="text-sm text-primary underline-offset-4 hover:underline">
            Open Plugin Docs
          </a>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Status</span>
            {isConnected ? (
              <Badge className="bg-green-500 text-white">{statusLabel}</Badge>
            ) : (
              <Badge variant="secondary">{statusLabel}</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Plugin</span>
            <span className="text-sm text-muted-foreground">
              {pluginInstalled
                ? `${channel?.pluginSpec || "qqbot"}${channel?.pluginVersion ? ` (${channel.pluginVersion})` : ""}`
                : channel?.pluginSpec || "@sliverp/qqbot@1.5.2"}
            </span>
          </div>
        </div>
      </section>

      {!pluginInstalled ? (
        <>
          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Install Plugin</h2>
            <p className="text-sm text-muted-foreground mb-1">QQ Bot support comes from the community plugin <Code>{channel?.pluginSpec || "@sliverp/qqbot@1.5.2"}</Code>. Installing it lets OpenClaw expose the <Code>qqbot</Code> channel.</p>
            <p className="text-sm text-muted-foreground mb-4">This action installs and runs third-party code inside OpenClaw. Review the plugin before installing it in production.</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={loading} onClick={() => void onInstallPlugin()} type="button">
                Install QQ Bot Plugin
              </Button>
              <Button variant="outline" disabled={loading} onClick={() => void onRefresh()} type="button">
                Refresh
              </Button>
            </div>
            {installResult?.output && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium text-sm select-none">Install Output</summary>
                <pre className="mt-3 text-xs overflow-auto bg-muted p-3 rounded-md">{installResult.output}</pre>
              </details>
            )}
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Before You Install</h2>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                Open{" "}
                <a href={QQBOT_OFFICIAL_URL} rel="noreferrer" target="_blank" className="text-primary underline-offset-4 hover:underline">
                  QQ Bot for OpenClaw
                </a>
                , then sign in or register and create your QQ Bot application.
              </li>
              <li>Keep the plugin docs open and verify the permissions you need.</li>
              <li>Install the plugin here, then come back to fill in <Code>App ID</Code> and <Code>App Secret</Code>.</li>
            </ol>
          </section>
        </>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Before You Start</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border p-4">
                <strong className="font-semibold">1. Open QQ Bot Platform</strong>
                <p className="text-sm text-muted-foreground mt-1">Use the official OpenClaw entry page on QQ Open Platform. From there you can sign in, register if needed, and create your QQ Bot application.</p>
                <p className="mt-2">
                  <a href={QQBOT_OFFICIAL_URL} rel="noreferrer" target="_blank" className="text-sm text-primary underline-offset-4 hover:underline">
                    Open QQ Bot Platform
                  </a>
                </p>
              </div>
              <div className="rounded-md border p-4">
                <strong className="font-semibold">2. Copy App ID and App Secret</strong>
                <p className="text-sm text-muted-foreground mt-1">After creating the bot, open its management page and copy the <Code>App ID</Code> and <Code>App Secret</Code> back into this form.</p>
              </div>
              <div className="rounded-md border p-4">
                <strong className="font-semibold">3. Start with sandbox direct messages</strong>
                <p className="text-sm text-muted-foreground mt-1">The plugin README recommends beginning with QQ sandbox direct messages before expanding to other message types.</p>
                <p className="mt-2">
                  <a href={QQBOT_DOCS_URL} rel="noreferrer" target="_blank" className="text-sm text-primary underline-offset-4 hover:underline">
                    Open Plugin Guide
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold">Configuration</h2>
              <Button variant="outline" disabled={loading} onClick={() => void onRefresh()} type="button">
                Refresh
              </Button>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Enable QQ Bot</Label>
                <p className="text-sm text-muted-foreground">Turn the QQ Bot channel on after the plugin is installed and configured.</p>
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox
                    id="qqbot-enabled"
                    checked={form.enabled}
                    onCheckedChange={(checked) => onFormChange((prev) => ({ ...prev, enabled: checked === true }))}
                  />
                  <Label htmlFor="qqbot-enabled">Enabled</Label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="app-id" className="text-sm font-medium">App ID</Label>
                <p className="text-sm text-muted-foreground">Paste the QQ Bot <Code>App ID</Code> from <a href={QQBOT_OFFICIAL_URL} rel="noreferrer" target="_blank" className="text-primary underline-offset-4 hover:underline">QQ Bot for OpenClaw</a>.</p>
                <Input
                  id="app-id"
                  className="max-w-md"
                  onChange={(event) => onFormChange((prev) => ({ ...prev, appId: event.target.value }))}
                  placeholder="1024..."
                  type="text"
                  value={form.appId}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="client-secret" className="text-sm font-medium">App Secret</Label>
                <p className="text-sm text-muted-foreground">Paste the <Code>App Secret</Code>. Leave this blank to keep the already saved secret while updating other settings.</p>
                <Input
                  id="client-secret"
                  className="max-w-md"
                  onChange={(event) => onFormChange((prev) => ({ ...prev, clientSecret: event.target.value }))}
                  placeholder="Paste App Secret"
                  type="password"
                  value={form.clientSecret}
                />
                {channel?.clientSecretConfigured && <p className="text-xs text-muted-foreground">An App Secret is already saved in OpenClaw.</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Allow From</Label>
                <p className="text-sm text-muted-foreground">Allowed QQ users. Add one user ID at a time. Use <Code>*</Code> to allow everyone.</p>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      className="max-w-xs"
                      onChange={(event) => setAllowFromDraft(event.target.value)}
                      onKeyDown={handleAllowFromKeyDown}
                      placeholder="QQ user ID or *"
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
                <Label className="text-sm font-medium">Markdown Support</Label>
                <p className="text-sm text-muted-foreground">Enable only if your QQ Bot account has permission to send markdown messages.</p>
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox
                    id="markdown-support"
                    checked={form.markdownSupport}
                    onCheckedChange={(checked) => onFormChange((prev) => ({ ...prev, markdownSupport: checked === true }))}
                  />
                  <Label htmlFor="markdown-support">Enable markdown messages</Label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="image-server-url" className="text-sm font-medium">Image Server Base URL</Label>
                <p className="text-sm text-muted-foreground">Optional. Set this only if you need the plugin image server workflow described in the plugin docs.</p>
                <Input
                  id="image-server-url"
                  className="max-w-md"
                  onChange={(event) => onFormChange((prev) => ({ ...prev, imageServerBaseUrl: event.target.value }))}
                  placeholder="https://example.com"
                  type="url"
                  value={form.imageServerBaseUrl}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button disabled={loading || !isDirty || !form.appId.trim()} onClick={() => void onSave()} type="button">
                  Save Configuration
                </Button>
                <Button variant="destructive" disabled={loading || !channel?.configured} onClick={() => void onDisconnect()} type="button">
                  Remove Configuration
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">How To Verify It Works</h2>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Save the configuration on this page.</li>
              <li>Open <a href={QQBOT_OFFICIAL_URL} rel="noreferrer" target="_blank" className="text-primary underline-offset-4 hover:underline">QQ Bot for OpenClaw</a> and keep the bot in sandbox mode.</li>
              <li>Add the bot to your own QQ account in sandbox testing.</li>
              <li>Send a direct message to confirm the bot can receive and reply.</li>
            </ol>
          </section>
        </>
      )}
    </>
  );
}
