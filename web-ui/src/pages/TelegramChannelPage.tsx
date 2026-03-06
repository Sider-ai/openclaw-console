import { useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

import type { TelegramChannel, TelegramChannelTestResult } from "../lib/types";

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
  const connectionLabel = channel?.configured ? "Configured" : "Not Configured";
  const connectionClass = channel?.configured ? "status-badge status-badge-connected" : "status-badge status-badge-disconnected";

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
      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>Telegram Channel</h2>
            <p className="muted">Connect OpenClaw to Telegram with a Telegram bot. Default mode is long polling, so you do not need a public webhook URL for the first setup.</p>
          </div>
          <a href={TELEGRAM_DOCS_URL} rel="noreferrer" target="_blank">
            Open Docs
          </a>
        </div>
        <div className="status-grid">
          <div className="status-row">
            <span>Status</span>
            <span className={connectionClass}>{connectionLabel}</span>
          </div>
          <div className="status-row">
            <span>Inbound Mode</span>
            <span className="muted">{channel?.mode || "polling"}</span>
          </div>
          <div className="status-row">
            <span>Current DM Policy</span>
            <span className="muted">{channel?.dmPolicy || "pairing"}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Before You Start</h2>
        <div className="guide-grid">
          <div className="guide-card">
            <strong>1. Open BotFather</strong>
            <p className="muted">In Telegram, search for <code>@BotFather</code>. This is the official Telegram bot used to create and manage bots.</p>
          </div>
          <div className="guide-card">
            <strong>2. Create a bot</strong>
            <p className="muted">Send <code>/newbot</code> to BotFather and follow the prompts. Telegram will give you a bot token.</p>
          </div>
          <div className="guide-card">
            <strong>3. Copy the token</strong>
            <p className="muted">The token looks like <code>123456:ABC...</code>. Paste it into the form below. Keep it secret.</p>
          </div>
          <div className="guide-card">
            <strong>4. Save and test</strong>
            <p className="muted">Save the configuration, then message your bot in Telegram with <code>/start</code> and a normal text message like <code>hello</code>.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h2>Configuration</h2>
          <button className="btn btn-secondary" onClick={() => void onRefresh()} disabled={loading} type="button">
            Refresh
          </button>
        </div>

        <label className="field-block">
          <span className="field-label">Enable Telegram</span>
          <span className="muted">Turn the Telegram channel on. If this is off, OpenClaw will ignore Telegram messages.</span>
          <label className="checkbox-row">
            <input
              checked={form.enabled}
              onChange={(event) => onFormChange((prev) => ({ ...prev, enabled: event.target.checked }))}
              type="checkbox"
            />
            <span>Enabled</span>
          </label>
        </label>

        <label className="field-block">
          <span className="field-label">Bot Token</span>
          <span className="muted">Paste the token from BotFather. Leave this blank if you only want to keep the already saved token and update other settings.</span>
          <input
            className="input-inline"
            onChange={(event) => onFormChange((prev) => ({ ...prev, botToken: event.target.value }))}
            placeholder="123456:ABCDEF..."
            type="password"
            value={form.botToken}
          />
          {channel?.botTokenConfigured && <small className="muted">A bot token is already saved in OpenClaw.</small>}
        </label>

        <label className="field-block">
          <span className="field-label">DM Policy</span>
          <span className="muted">Controls who can send direct messages to the bot. Recommended default: <code>pairing</code>.</span>
          <select onChange={(event) => onFormChange((prev) => ({ ...prev, dmPolicy: event.target.value }))} value={form.dmPolicy}>
            <option value="pairing">pairing</option>
            <option value="allowlist">allowlist</option>
            <option value="open">open</option>
            <option value="disabled">disabled</option>
          </select>
        </label>

        <label className="field-block">
          <span className="field-label">Allow From</span>
          <span className="muted">Telegram user IDs allowed to talk to the bot in direct messages. Add one ID at a time. For <code>open</code> DM policy, add <code>*</code>.</span>
          <div className="tag-editor">
            <div className="form-row">
              <input
                className="input-inline"
                onChange={(event) => setAllowFromDraft(event.target.value)}
                onKeyDown={handleAllowFromKeyDown}
                placeholder="123456789"
                type="text"
                value={allowFromDraft}
              />
              <button className="btn btn-secondary" disabled={!allowFromDraft.trim() || loading} onClick={() => appendAllowFromValues(allowFromDraft)} type="button">
                Add User ID
              </button>
            </div>
            {form.allowFrom.length > 0 ? (
              <div className="tag-list">
                {form.allowFrom.map((value) => (
                  <span className="tag-chip" key={value}>
                    <span>{value}</span>
                    <button className="tag-chip-remove" onClick={() => removeAllowFromValue(value)} type="button">
                      x
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">No user IDs added yet.</p>
            )}
          </div>
        </label>

        <label className="field-block">
          <span className="field-label">Group Policy</span>
          <span className="muted">Controls whether Telegram group messages are allowed. Recommended default: <code>allowlist</code>.</span>
          <select onChange={(event) => onFormChange((prev) => ({ ...prev, groupPolicy: event.target.value }))} value={form.groupPolicy}>
            <option value="allowlist">allowlist</option>
            <option value="open">open</option>
            <option value="disabled">disabled</option>
          </select>
        </label>

        <label className="field-block">
          <span className="field-label">Require Mention In Groups</span>
          <span className="muted">Recommended for beginners. When enabled, the bot replies in groups only when it is mentioned.</span>
          <label className="checkbox-row">
            <input
              checked={form.requireMention}
              onChange={(event) => onFormChange((prev) => ({ ...prev, requireMention: event.target.checked }))}
              type="checkbox"
            />
            <span>Require mention</span>
          </label>
        </label>

        <div className="form-row">
          <button className="btn" disabled={loading || !isDirty} onClick={() => void onSave()} type="button">
            Save Configuration
          </button>
          <button className="btn btn-secondary" disabled={loading || (!channel?.botTokenConfigured && !form.botToken.trim())} onClick={() => void onTestConnection()} type="button">
            Test Token
          </button>
          <button className="btn btn-warn" disabled={loading || !channel?.configured} onClick={() => void onDisconnect()} type="button">
            Remove Configuration
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>How To Verify It Works</h2>
        <ol className="guide-list">
          <li>Save the configuration in this page.</li>
          <li>Open Telegram and search for your bot by username.</li>
          <li>Send <code>/start</code> to the bot.</li>
          <li>Send a normal message such as <code>hello</code>.</li>
          <li>If you use <code>allowlist</code>, make sure your own Telegram user ID is included in <code>Allow From</code>.</li>
        </ol>
        {testResult && (
          <div className="test-result">
            <strong>{testResult.message}</strong>
            {(testResult.botUsername || testResult.botFirstName) && (
              <p className="muted">
                Bot: {testResult.botFirstName || "Telegram Bot"}
                {testResult.botUsername ? ` (@${testResult.botUsername})` : ""}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <details open>
          <summary>Troubleshooting</summary>
          <ul className="guide-list">
            <li>If the bot does not reply at all, test the token first. An invalid token is the most common setup error.</li>
            <li>If direct messages do not work, check <code>DM Policy</code> and make sure your Telegram user ID is allowed when using <code>allowlist</code>.</li>
            <li>If group messages do not work, add the bot to the group and keep <code>Require Mention</code> enabled until the basics are working.</li>
            <li>Telegram bots often use Privacy Mode by default. If you need the bot to see more group messages, review BotFather privacy settings later.</li>
          </ul>
        </details>
      </section>

      <section className="panel">
        <details>
          <summary>Advanced: Raw Telegram Channel State</summary>
          <pre>{JSON.stringify(channel, null, 2)}</pre>
        </details>
      </section>
    </>
  );
}
