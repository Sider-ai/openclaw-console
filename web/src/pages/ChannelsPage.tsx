import { MessageCircle, Send } from "lucide-react";

import type { ChannelSummary } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type ChannelsPageProps = {
  channels: ChannelSummary[];
  onOpenChannel: (channelId: string) => void;
};

function StatusBadge({ ok, labels }: { ok: boolean; labels: [string, string] }) {
  return ok ? (
    <Badge className="bg-green-500 text-white transition-colors duration-150 hover:bg-green-600">{labels[0]}</Badge>
  ) : (
    <Badge variant="secondary" className="transition-colors duration-150">{labels[1]}</Badge>
  );
}

function ChannelIcon({ channelId }: { channelId: string }) {
  if (channelId === "telegram") {
    return <Send className="h-5 w-5 text-muted-foreground" />;
  }
  return <MessageCircle className="h-5 w-5 text-muted-foreground" />;
}

export function ChannelsPage({ channels, onOpenChannel }: ChannelsPageProps) {
  return (
    <>
      <section className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-border/60">
        <h2 className="text-base font-semibold tracking-tight">Channels</h2>
        <Separator className="my-2" />
        <p className="text-sm text-muted-foreground">Channels let OpenClaw receive and send messages in external products. Configure Telegram directly, or install the QQ Bot community plugin and then finish the QQ configuration here.</p>
      </section>

      {channels.map((channel) => (
        <section
          className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md"
          key={channel.channelId}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <ChannelIcon channelId={channel.channelId} />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight">{channel.displayName}</h2>
                <p className="text-sm text-muted-foreground">
                  {channel.channelId === "telegram"
                    ? "Built-in Telegram channel using Telegram Bot API."
                    : "Community QQ Bot plugin channel. Install the plugin first, then configure App ID and App Secret."}
                </p>
              </div>
            </div>
            <Button onClick={() => onOpenChannel(channel.channelId)} type="button">
              {channel.pluginInstalled ? "Open Setup" : "Install & Configure"}
            </Button>
          </div>
          <Separator className="mb-3" />
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
