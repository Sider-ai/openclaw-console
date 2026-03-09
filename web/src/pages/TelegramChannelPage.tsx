import { useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

import type { TelegramChannel, TelegramChannelTestResult, TelegramPairingEntry } from "../lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  pairings: TelegramPairingEntry[];
  pairingLoading: boolean;
  pairingError: string;
  onApprovePairing: (code: string) => Promise<void>;
  onRejectPairing: (code: string) => Promise<void>;
  onRefreshPairings: () => Promise<void>;
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
  testResult,
  pairings,
  pairingLoading,
  pairingError,
  onApprovePairing,
  onRejectPairing,
  onRefreshPairings
}: TelegramChannelPageProps) {
  const [allowFromDraft, setAllowFromDraft] = useState("");
  const [pairingCodeDraft, setPairingCodeDraft] = useState("");
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
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Telegram Channel</CardTitle>
              <CardDescription className="mt-1">Connect OpenClaw to Telegram with a Telegram bot. Default mode is long polling, so you do not need a public webhook URL for the first setup.</CardDescription>
            </div>
            <a href={TELEGRAM_DOCS_URL} rel="noreferrer" target="_blank" className="text-sm text-primary underline-offset-4 hover:underline">
              Open Docs
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              {isConfigured ? (
                <Badge variant="success" className="transition-colors duration-150">Configured</Badge>
              ) : (
                <Badge variant="secondary" className="transition-colors duration-150">Not Configured</Badge>
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
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="text-base">Quick setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="shadow-none">
              <CardContent className="p-4">
                <strong className="font-semibold">1. Create a bot via BotFather</strong>
                <p className="text-sm text-muted-foreground mt-1">Open <Code>@BotFather</Code> in Telegram and send <Code>/newbot</Code>. Follow the prompts — BotFather will give you a bot token when done.</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <strong className="font-semibold">2. Paste the token and save</strong>
                <p className="text-sm text-muted-foreground mt-1">Paste the token into the <strong>Bot Token</strong> field below. Set <strong>DM Policy</strong> to <Code>pairing</Code> (recommended), then click <strong>Save Configuration</strong>.</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <strong className="font-semibold">3. Start the gateway and approve pairing</strong>
                <p className="text-sm text-muted-foreground mt-1">Start OpenClaw so the bot comes online. With <Code>pairing</Code> DM policy, send any message to the bot in Telegram — OpenClaw will issue a pairing code that you approve from the server. Pairing codes expire after one hour.</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <strong className="font-semibold">4. Add the bot to groups (optional)</strong>
                <p className="text-sm text-muted-foreground mt-1">Add your bot to the desired groups and configure <strong>Group Policy</strong> below. If the bot needs to see all group messages, disable privacy mode via BotFather's <Code>/setprivacy</Code> command, then re-add the bot to the group.</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base">Configuration</CardTitle>
            <Button variant="outline" onClick={() => void onRefresh()} disabled={loading} type="button">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enable Telegram</Label>
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
              <Label htmlFor="bot-token" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bot Token</Label>
              <p className="text-sm text-muted-foreground">Paste the token from BotFather. Leave this blank if you only want to keep the already saved token and update other settings.</p>
              <Input
                id="bot-token"
                onChange={(event) => onFormChange((prev) => ({ ...prev, botToken: event.target.value }))}
                placeholder="123456:ABCDEF..."
                type="password"
                value={form.botToken}
                className="max-w-md transition-colors duration-150"
              />
              {channel?.botTokenConfigured && <p className="text-xs text-muted-foreground">A bot token is already saved in OpenClaw.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dm-policy" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DM Policy</Label>
              <p className="text-sm text-muted-foreground">Controls who can send direct messages to the bot. Recommended default: <Code>pairing</Code>.</p>
              <Select value={form.dmPolicy} onValueChange={(value) => onFormChange((prev) => ({ ...prev, dmPolicy: value }))}>
                <SelectTrigger id="dm-policy" className="max-w-xs transition-colors duration-150">
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

            {form.dmPolicy === "allowlist" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Allow From</Label>
                <p className="text-sm text-muted-foreground">Telegram user IDs allowed to send direct messages to the bot. Add one ID at a time.</p>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      className="max-w-xs transition-colors duration-150"
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
            )}

            {form.dmPolicy === "pairing" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pairing Code</Label>
                  <p className="text-sm text-muted-foreground">When a new user messages the bot, they receive a pairing code. Paste it here to approve or reject their access.</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      className="max-w-xs font-mono transition-colors duration-150"
                      onChange={(e) => setPairingCodeDraft(e.target.value)}
                      placeholder="e.g. RXKQABQE"
                      type="text"
                      value={pairingCodeDraft}
                    />
                    <Button
                      disabled={pairingLoading || !pairingCodeDraft.trim()}
                      onClick={() => { void onApprovePairing(pairingCodeDraft.trim()); setPairingCodeDraft(""); }}
                      type="button"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={pairingLoading || !pairingCodeDraft.trim()}
                      onClick={() => { void onRejectPairing(pairingCodeDraft.trim()); setPairingCodeDraft(""); }}
                      type="button"
                    >
                      Reject
                    </Button>
                  </div>
                  {pairingError && <p className="text-sm text-destructive">{pairingError}</p>}
                </div>
                {pairings.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Requests</Label>
                      <Button variant="ghost" size="sm" onClick={() => void onRefreshPairings()} disabled={pairingLoading} type="button" className="text-xs h-auto py-1">
                        Refresh
                      </Button>
                    </div>
                    {pairings.map((entry) => (
                      <Card key={entry.code} className="shadow-none">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                              {entry.firstName || "Unknown user"}
                              {entry.username && <span className="text-muted-foreground font-normal"> (@{entry.username})</span>}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              User ID: <Code>{entry.userId}</Code>
                              {entry.requestedAt && <> · {new Date(entry.requestedAt).toLocaleString()}</>}
                            </span>
                            <span className="text-xs text-muted-foreground">Code: <Code>{entry.code}</Code></span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" disabled={pairingLoading} onClick={() => void onApprovePairing(entry.code)} type="button">
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" disabled={pairingLoading} onClick={() => void onRejectPairing(entry.code)} type="button">
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-policy" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Group Policy</Label>
              <p className="text-sm text-muted-foreground">Controls whether Telegram group messages are allowed. Recommended default: <Code>allowlist</Code>.</p>
              <Select value={form.groupPolicy} onValueChange={(value) => onFormChange((prev) => ({ ...prev, groupPolicy: value }))}>
                <SelectTrigger id="group-policy" className="max-w-xs transition-colors duration-150">
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
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Require Mention In Groups</Label>
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
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="text-base">How To Verify It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Save the configuration in this page.</li>
            <li>Open Telegram and search for your bot by username.</li>
            <li>Send <Code>/start</Code> to the bot.</li>
            <li>Send a normal message such as <Code>hello</Code>.</li>
            <li>If you use <Code>allowlist</Code>, make sure your own Telegram user ID is included in <Code>Allow From</Code>.</li>
          </ol>
          {testResult && (
            <Alert className="mt-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
              <AlertTitle>{testResult.message}</AlertTitle>
              {(testResult.botUsername || testResult.botFirstName) && (
                <AlertDescription>
                  Bot: {testResult.botFirstName || "Telegram Bot"}
                  {testResult.botUsername ? ` (@${testResult.botUsername})` : ""}
                </AlertDescription>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/60">
        <CardContent className="p-6">
          <details open>
            <summary className="cursor-pointer font-medium text-sm select-none">Troubleshooting</summary>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-3">
              <li>If the bot does not reply at all, test the token first. An invalid token is the most common setup error.</li>
              <li>If direct messages do not work, check <Code>DM Policy</Code> and make sure your Telegram user ID is allowed when using <Code>allowlist</Code>.</li>
              <li>If group messages do not work, add the bot to the group and keep <Code>Require Mention</Code> enabled until the basics are working.</li>
              <li>Telegram bots often use Privacy Mode by default. If you need the bot to see more group messages, review BotFather privacy settings later.</li>
            </ul>
          </details>
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/60">
        <CardContent className="p-6">
          <details>
            <summary className="cursor-pointer font-medium text-sm select-none">Advanced: Raw Telegram Channel State</summary>
            <pre className="mt-3 font-mono text-xs bg-muted/50 rounded-xl p-4 border border-border/50 overflow-auto">{JSON.stringify(channel, null, 2)}</pre>
          </details>
        </CardContent>
      </Card>
    </>
  );
}
