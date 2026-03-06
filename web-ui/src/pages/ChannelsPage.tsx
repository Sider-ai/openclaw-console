import type { ChannelSummary } from "../lib/types";

type ChannelsPageProps = {
  channels: ChannelSummary[];
  onOpenChannel: (channelId: string) => void;
};

export function ChannelsPage({ channels, onOpenChannel }: ChannelsPageProps) {
  return (
    <>
      <section className="panel">
        <h2>Channels</h2>
        <p className="muted">Channels let OpenClaw receive and send messages in external products. Configure Telegram directly, or install the QQ Bot community plugin and then finish the QQ configuration here.</p>
      </section>

      {channels.map((channel) => (
        <section className="panel" key={channel.channelId}>
          <div className="panel-title-row">
            <div>
              <h2>{channel.displayName}</h2>
              <p className="muted">
                {channel.channelId === "telegram"
                  ? "Built-in Telegram channel using Telegram Bot API."
                  : "Community QQ Bot plugin channel. Install the plugin first, then configure App ID and App Secret."}
              </p>
            </div>
            <button className="btn" onClick={() => onOpenChannel(channel.channelId)} type="button">
              {channel.pluginInstalled ? "Open Setup" : "Install & Configure"}
            </button>
          </div>
          <div className="status-grid">
            <div className="status-row">
              <span>Installed</span>
              <span className={channel.pluginInstalled ? "status-badge status-badge-connected" : "status-badge status-badge-disconnected"}>
                {channel.pluginInstalled ? "Installed" : "Not Installed"}
              </span>
            </div>
            <div className="status-row">
              <span>Configured</span>
              <span className={channel.configured ? "status-badge status-badge-connected" : "status-badge status-badge-disconnected"}>
                {channel.configured ? "Configured" : "Not Configured"}
              </span>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
