import { useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

import type { PluginInstallResult, QQBotChannel } from "../lib/types";

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
  const statusClass = pluginInstalled
    ? channel?.configured
      ? "status-badge status-badge-connected"
      : "status-badge status-badge-disconnected"
    : "status-badge status-badge-disconnected";

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
            <h2>QQ Bot</h2>
            <p className="muted">Connect OpenClaw to Tencent QQ Bot through the community plugin. This is not a built-in OpenClaw channel.</p>
          </div>
          <a href={QQBOT_DOCS_URL} rel="noreferrer" target="_blank">
            Open Plugin Docs
          </a>
        </div>
        <div className="status-grid">
          <div className="status-row">
            <span>Status</span>
            <span className={statusClass}>{statusLabel}</span>
          </div>
          <div className="status-row">
            <span>Plugin</span>
            <span className="muted">{pluginInstalled ? `${channel?.pluginSpec || "qqbot"}${channel?.pluginVersion ? ` (${channel.pluginVersion})` : ""}` : channel?.pluginSpec || "@sliverp/qqbot@1.5.2"}</span>
          </div>
        </div>
      </section>

      {!pluginInstalled ? (
        <>
          <section className="panel">
            <h2>Install Plugin</h2>
            <p className="muted">QQ Bot support comes from the community plugin <code>{channel?.pluginSpec || "@sliverp/qqbot@1.5.2"}</code>. Installing it lets OpenClaw expose the <code>qqbot</code> channel.</p>
            <p className="muted">This action installs and runs third-party code inside OpenClaw. Review the plugin before installing it in production.</p>
            <div className="form-row">
              <button className="btn" disabled={loading} onClick={() => void onInstallPlugin()} type="button">
                Install QQ Bot Plugin
              </button>
              <button className="btn btn-secondary" disabled={loading} onClick={() => void onRefresh()} type="button">
                Refresh
              </button>
            </div>
            {installResult?.output && (
              <details>
                <summary>Install Output</summary>
                <pre>{installResult.output}</pre>
              </details>
            )}
          </section>

          <section className="panel">
            <h2>Before You Install</h2>
            <ol className="guide-list">
              <li>
                Open{" "}
                <a href={QQBOT_OFFICIAL_URL} rel="noreferrer" target="_blank">
                  QQ Bot for OpenClaw
                </a>
                , then sign in or register and create your QQ Bot application.
              </li>
              <li>Keep the plugin docs open and verify the permissions you need.</li>
              <li>Install the plugin here, then come back to fill in <code>App ID</code> and <code>App Secret</code>.</li>
            </ol>
          </section>
        </>
      ) : (
        <>
          <section className="panel">
            <h2>Before You Start</h2>
            <div className="guide-grid">
              <div className="guide-card">
                <strong>1. Open QQ Bot Platform</strong>
                <p className="muted">Use the official OpenClaw entry page on QQ Open Platform. From there you can sign in, register if needed, and create your QQ Bot application.</p>
                <p>
                  <a href={QQBOT_OFFICIAL_URL} rel="noreferrer" target="_blank">
                    Open QQ Bot Platform
                  </a>
                </p>
              </div>
              <div className="guide-card">
                <strong>2. Copy App ID and App Secret</strong>
                <p className="muted">After creating the bot, open its management page and copy the <code>App ID</code> and <code>App Secret</code> back into this form.</p>
              </div>
              <div className="guide-card">
                <strong>3. Start with sandbox direct messages</strong>
                <p className="muted">The plugin README recommends beginning with QQ sandbox direct messages before expanding to other message types.</p>
                <p>
                  <a href={QQBOT_DOCS_URL} rel="noreferrer" target="_blank">
                    Open Plugin Guide
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title-row">
              <h2>Configuration</h2>
              <button className="btn btn-secondary" disabled={loading} onClick={() => void onRefresh()} type="button">
                Refresh
              </button>
            </div>

            <label className="field-block">
              <span className="field-label">Enable QQ Bot</span>
              <span className="muted">Turn the QQ Bot channel on after the plugin is installed and configured.</span>
              <label className="checkbox-row">
                <input checked={form.enabled} onChange={(event) => onFormChange((prev) => ({ ...prev, enabled: event.target.checked }))} type="checkbox" />
                <span>Enabled</span>
              </label>
            </label>

            <label className="field-block">
              <span className="field-label">App ID</span>
              <span className="muted">Paste the QQ Bot <code>App ID</code> from <a href={QQBOT_OFFICIAL_URL} rel="noreferrer" target="_blank">QQ Bot for OpenClaw</a>.</span>
              <input className="input-inline" onChange={(event) => onFormChange((prev) => ({ ...prev, appId: event.target.value }))} placeholder="1024..." type="text" value={form.appId} />
            </label>

            <label className="field-block">
              <span className="field-label">App Secret</span>
              <span className="muted">Paste the <code>App Secret</code>. Leave this blank to keep the already saved secret while updating other settings.</span>
              <input className="input-inline" onChange={(event) => onFormChange((prev) => ({ ...prev, clientSecret: event.target.value }))} placeholder="Paste App Secret" type="password" value={form.clientSecret} />
              {channel?.clientSecretConfigured && <small className="muted">An App Secret is already saved in OpenClaw.</small>}
            </label>

            <label className="field-block">
              <span className="field-label">Allow From</span>
              <span className="muted">Allowed QQ users. Add one user ID at a time. Use <code>*</code> to allow everyone.</span>
              <div className="tag-editor">
                <div className="form-row">
                  <input className="input-inline" onChange={(event) => setAllowFromDraft(event.target.value)} onKeyDown={handleAllowFromKeyDown} placeholder="QQ user ID or *" type="text" value={allowFromDraft} />
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
                  <p className="muted">No allowed users added yet.</p>
                )}
              </div>
            </label>

            <label className="field-block">
              <span className="field-label">Markdown Support</span>
              <span className="muted">Enable only if your QQ Bot account has permission to send markdown messages.</span>
              <label className="checkbox-row">
                <input checked={form.markdownSupport} onChange={(event) => onFormChange((prev) => ({ ...prev, markdownSupport: event.target.checked }))} type="checkbox" />
                <span>Enable markdown messages</span>
              </label>
            </label>

            <label className="field-block">
              <span className="field-label">Image Server Base URL</span>
              <span className="muted">Optional. Set this only if you need the plugin image server workflow described in the plugin docs.</span>
              <input className="input-inline" onChange={(event) => onFormChange((prev) => ({ ...prev, imageServerBaseUrl: event.target.value }))} placeholder="https://example.com" type="url" value={form.imageServerBaseUrl} />
            </label>

            <div className="form-row">
              <button className="btn" disabled={loading || !isDirty || !form.appId.trim()} onClick={() => void onSave()} type="button">
                Save Configuration
              </button>
              <button className="btn btn-warn" disabled={loading || !channel?.configured} onClick={() => void onDisconnect()} type="button">
                Remove Configuration
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>How To Verify It Works</h2>
            <ol className="guide-list">
              <li>Save the configuration on this page.</li>
              <li>Open <a href={QQBOT_OFFICIAL_URL} rel="noreferrer" target="_blank">QQ Bot for OpenClaw</a> and keep the bot in sandbox mode.</li>
              <li>Add the bot to your own QQ account in sandbox testing.</li>
              <li>Send a direct message to confirm the bot can receive and reply.</li>
            </ol>
          </section>
        </>
      )}
    </>
  );
}
