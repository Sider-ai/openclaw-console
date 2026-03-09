import { MessageCircle, Send } from "lucide-react";

import type { ChannelSummary } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ChannelsPageProps = {
  channels: ChannelSummary[];
  onOpenChannel: (channelId: string) => void;
};

function StatusBadge({ ok, labels }: { ok: boolean; labels: [string, string] }) {
  return ok ? (
    <Badge variant="success" className="transition-colors duration-150">{labels[0]}</Badge>
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
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="text-base">Channels</CardTitle>
          <CardDescription>Channels let OpenClaw receive and send messages in external products. Configure Telegram directly, or install the community plugins for QQ Bot or WeCom App and finish the configuration here.</CardDescription>
        </CardHeader>
      </Card>

      {channels.map((channel) => (
        <Card
          className="shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md"
          key={channel.channelId}
        >
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <ChannelIcon channelId={channel.channelId} />
                </div>
                <div>
                  <CardTitle className="text-base">{channel.displayName}</CardTitle>
                  <CardDescription>
                    {channel.channelId === "telegram"
                      ? "Built-in Telegram channel using Telegram Bot API."
                      : channel.channelId === "qqbot"
                        ? "Community QQ Bot plugin channel. Install the plugin first, then configure App ID and App Secret."
                        : channel.channelId === "wecom-app"
                            ? "Community WeCom App plugin channel. Install the plugin first, then configure Corp ID and credentials."
                            : "Plugin channel. Install the plugin first, then configure."}
                  </CardDescription>
                </div>
              </div>
              <Button onClick={() => onOpenChannel(channel.channelId)} type="button">
                {channel.pluginInstalled ? "Open Setup" : "Install & Configure"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      ))}
    </>
  );
}
