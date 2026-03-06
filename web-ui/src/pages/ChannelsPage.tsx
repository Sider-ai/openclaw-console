import type { ChannelSummary } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ChannelsPageProps = {
  channels: ChannelSummary[];
  onOpenChannel: (channelId: string) => void;
};

function StatusBadge({ ok, labels }: { ok: boolean; labels: [string, string] }) {
  return ok ? (
    <Badge className="bg-green-500 text-white">{labels[0]}</Badge>
  ) : (
    <Badge variant="secondary">{labels[1]}</Badge>
  );
}

export function ChannelsPage({ channels, onOpenChannel }: ChannelsPageProps) {
  return (
    <>
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Channels</h2>
        <p className="text-sm text-muted-foreground">Channels let OpenClaw receive and send messages in external products. Configure Telegram directly, or install the QQ Bot community plugin and then finish the QQ configuration here.</p>
      </section>

      {channels.map((channel) => (
        <section className="rounded-lg border bg-card p-6 shadow-sm" key={channel.channelId}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">{channel.displayName}</h2>
              <p className="text-sm text-muted-foreground">
                {channel.channelId === "telegram"
                  ? "Built-in Telegram channel using Telegram Bot API."
                  : "Community QQ Bot plugin channel. Install the plugin first, then configure App ID and App Secret."}
              </p>
            </div>
            <Button onClick={() => onOpenChannel(channel.channelId)} type="button">
              {channel.pluginInstalled ? "Open Setup" : "Install & Configure"}
            </Button>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Installed</span>
              <StatusBadge ok={channel.pluginInstalled} labels={["Installed", "Not Installed"]} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Configured</span>
              <StatusBadge ok={channel.configured} labels={["Configured", "Not Configured"]} />
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
