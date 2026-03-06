import { useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

import type { TelegramChannel, TelegramChannelTestResult } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code } from "@/components/code";

type TelegramChannelForm = {
  enabled: boolean;
  botToken: string;
  dmPolicy: string;
  allowFrom: string[];
  groupPolicy: string;
  requireMention: boolean;
};

type TelegramChannelPageProps = {
  channel: TelegramChannel | null;
  form: TelegramChannelForm;
  loading: boolean;
  isDirty: boolean;
  onFormChange: Dispatch<SetStateAction<TelegramChannelForm>>;
  onRefresh: () => Promise<void>;
  onSave: () => Promise<void>;
  onTestConnection: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  testResult: TelegramChannelTestResult | null;
};

const TELEGRAM_DOCS_URL = "https://docs.openclaw.ai/channels/telegram";

export function TelegramChannelPage({
  channel,
  form,
  loading,
  isDirty,
  onFormChange,
  onRefresh,
  onSave,
  onTestConnection,
  onDisconnect,
  testResult
}: TelegramChannelPageProps) {
  const [allowFromDraft, setAllowFromDraft] = useState("");
  const isConfigured = channel?.configured ?? false;

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
            <h2 className="text-xl font-semibold">Telegram Channel</h2>
            <p className="text-sm text-muted-foreground">Connect OpenClaw to Telegram with a Telegram bot. Default mode is long polling, so you do not need a public webhook URL for the first setup.</p>
          </div>
          <a href={TELEGRAM_DOCS_URL} rel="noreferrer" target="_blank" className="text-sm text-primary underline-offset-4 hover:underline">
            Open Docs
          </a>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Status</span>
            {isConfigured ? (
              <Badge className="bg-green-500 text-white">Configured</Badge>
            ) : (
              <Badge variant="secondary">Not Configured</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Inbound Mode</span>
            <span className="text-sm text-muted-foreground">{channel?.mode || "polling"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Current DM Policy</span>
            <span className="text-sm text-muted-foreground">{channel?.dmPolicy || "pairing"}</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Before You Start</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-md border p-4">
            <strong className="font-semibold">1. Open BotFather</strong>
            <p className="text-sm text-muted-foreground mt-1">In Telegram, search for <Code>@BotFather</Code>. This is the official Telegram bot used to create and manage bots.</p>
          </div>
          <div className="rounded-md border p-4">
            <strong className="font-semibold">2. Create a bot</strong>
            <p className="text-sm text-muted-foreground mt-1">Send <Code>/newbot</Code> to BotFather and follow the prompts. Telegram will give you a bot token.</p>
          </div>
          <div className="rounded-md border p-4">
            <strong className="font-semibold">3. Copy the token</strong>
            <p className="text-sm text-muted-foreground mt-1">The token looks like <Code>123456:ABC...</Code>. Paste it into the form below. Keep it secret.</p>
          </div>
          <div className="rounded-md border p-4">
            <strong className="font-semibold">4. Save and test</strong>
            <p className="text-sm text-muted-foreground mt-1">Save the configuration, then message your bot in Telegram with <Code>/start</Code> and a normal text message like <Code>hello</Code>.</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">Configuration</h2>
          <Button variant="outline" onClick={() => void onRefresh()} disabled={loading} type="button">
            Refresh
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Enable Telegram</Label>
            <p className="text-sm text-muted-foreground">Turn the Telegram channel on. If this is off, OpenClaw will ignore Telegram messages.</p>
            <div className="flex items-center gap-2 mt-1">
              <Checkbox
                id="telegram-enabled"
                checked={form.enabled}
                onCheckedChange={(checked) => onFormChange((prev) => ({ ...prev, enabled: checked === true }))}
              />
              <Label htmlFor="telegram-enabled">Enabled</Label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bot-token" className="text-sm font-medium">Bot Token</Label>
            <p className="text-sm text-muted-foreground">Paste the token from BotFather. Leave this blank if you only want to keep the already saved token and update other settings.</p>
            <Input
              id="bot-token"
              onChange={(event) => onFormChange((prev) => ({ ...prev, botToken: event.target.value }))}
              placeholder="123456:ABCDEF..."
              type="password"
              value={form.botToken}
              className="max-w-md"
            />
            {channel?.botTokenConfigured && <p className="text-xs text-muted-foreground">A bot token is already saved in OpenClaw.</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dm-policy" className="text-sm font-medium">DM Policy</Label>
            <p className="text-sm text-muted-foreground">Controls who can send direct messages to the bot. Recommended default: <Code>pairing</Code>.</p>
            <Select value={form.dmPolicy} onValueChange={(value) => onFormChange((prev) => ({ ...prev, dmPolicy: value }))}>
              <SelectTrigger id="dm-policy" className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pairing">pairing</SelectItem>
                <SelectItem value="allowlist">allowlist</SelectItem>
                <SelectItem value="open">open</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Allow From</Label>
            <p className="text-sm text-muted-foreground">Telegram user IDs allowed to talk to the bot in direct messages. Add one ID at a time. For <Code>open</Code> DM policy, add <Code>*</Code>.</p>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  className="max-w-xs"
                  onChange={(event) => setAllowFromDraft(event.target.value)}
                  onKeyDown={handleAllowFromKeyDown}
                  placeholder="123456789"
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
                <p className="text-sm text-muted-foreground">No user IDs added yet.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-policy" className="text-sm font-medium">Group Policy</Label>
            <p className="text-sm text-muted-foreground">Controls whether Telegram group messages are allowed. Recommended default: <Code>allowlist</Code>.</p>
            <Select value={form.groupPolicy} onValueChange={(value) => onFormChange((prev) => ({ ...prev, groupPolicy: value }))}>
              <SelectTrigger id="group-policy" className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allowlist">allowlist</SelectItem>
                <SelectItem value="open">open</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Require Mention In Groups</Label>
            <p className="text-sm text-muted-foreground">Recommended for beginners. When enabled, the bot replies in groups only when it is mentioned.</p>
            <div className="flex items-center gap-2 mt-1">
              <Checkbox
                id="require-mention"
                checked={form.requireMention}
                onCheckedChange={(checked) => onFormChange((prev) => ({ ...prev, requireMention: checked === true }))}
              />
              <Label htmlFor="require-mention">Require mention</Label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={loading || !isDirty} onClick={() => void onSave()} type="button">
              Save Configuration
            </Button>
            <Button variant="outline" disabled={loading || (!channel?.botTokenConfigured && !form.botToken.trim())} onClick={() => void onTestConnection()} type="button">
              Test Token
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
          <li>Save the configuration in this page.</li>
          <li>Open Telegram and search for your bot by username.</li>
          <li>Send <Code>/start</Code> to the bot.</li>
          <li>Send a normal message such as <Code>hello</Code>.</li>
          <li>If you use <Code>allowlist</Code>, make sure your own Telegram user ID is included in <Code>Allow From</Code>.</li>
        </ol>
        {testResult && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
            <strong className="font-semibold">{testResult.message}</strong>
            {(testResult.botUsername || testResult.botFirstName) && (
              <p className="text-sm text-muted-foreground mt-1">
                Bot: {testResult.botFirstName || "Telegram Bot"}
                {testResult.botUsername ? ` (@${testResult.botUsername})` : ""}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <details open>
          <summary className="cursor-pointer font-medium text-sm select-none">Troubleshooting</summary>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-3">
            <li>If the bot does not reply at all, test the token first. An invalid token is the most common setup error.</li>
            <li>If direct messages do not work, check <Code>DM Policy</Code> and make sure your Telegram user ID is allowed when using <Code>allowlist</Code>.</li>
            <li>If group messages do not work, add the bot to the group and keep <Code>Require Mention</Code> enabled until the basics are working.</li>
            <li>Telegram bots often use Privacy Mode by default. If you need the bot to see more group messages, review BotFather privacy settings later.</li>
          </ul>
        </details>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <details>
          <summary className="cursor-pointer font-medium text-sm select-none">Advanced: Raw Telegram Channel State</summary>
          <pre className="mt-3 text-xs overflow-auto bg-muted p-3 rounded-md">{JSON.stringify(channel, null, 2)}</pre>
        </details>
      </section>
    </>
  );
}
