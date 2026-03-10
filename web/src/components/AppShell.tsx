import type { PropsWithChildren } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Bot, ChevronRight, Cpu, Loader2, MessageSquare, Wrench } from "lucide-react";

import { ROOT_NAV_ITEMS } from "../lib/navigation";
import type { BuildInfo, ChannelNav, ModelProviderNav, NavKey } from "../lib/types";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const ROOT_NAV_ICONS: Record<string, LucideIcon> = {
  agents: Bot,
  tools: Wrench
};

type AppShellProps = PropsWithChildren<{
  activeNav: NavKey;
  apiBase: string;
  buildInfo: BuildInfo | null;
  channelNav: ChannelNav[];
  channelRoute: string | null;
  channelsExpanded: boolean;
  error: string;
  loading: boolean;
  modelsExpanded: boolean;
  onNavigate: NavigateFunction;
  onToggleChannels: () => void;
  onToggleModels: () => void;
  providerNav: ModelProviderNav[];
  providerRoute: string | null;
}>;

export function AppShell({
  activeNav,
  apiBase,
  buildInfo,
  channelNav,
  channelRoute,
  channelsExpanded,
  children,
  error,
  loading,
  modelsExpanded,
  onNavigate,
  onToggleChannels,
  onToggleModels,
  providerNav,
  providerRoute
}: AppShellProps) {
  const versionLabel = buildInfo?.revision
    ? `Build ${buildInfo.revision.slice(0, 7)}`
    : "Build unknown";

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2 py-1.5">
            <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border bg-sidebar-accent text-sm font-bold tracking-wide">
              OC
            </span>
            <div>
              <div className="text-sm font-bold leading-tight">OpenClaw</div>
              <div className="text-xs text-sidebar-foreground/70">Console</div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              {ROOT_NAV_ITEMS.map((item) => {
                const Icon = ROOT_NAV_ICONS[item.key];
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={activeNav === item.key}
                      onClick={() => onNavigate(item.path)}
                      tooltip={item.label}
                    >
                      {Icon && <Icon />}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible
                open={channelsExpanded}
                onOpenChange={onToggleChannels}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={activeNav === "channels"}
                      tooltip="Channels"
                    >
                      <MessageSquare />
                      <span>Channels</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {channelNav.map((item) => (
                        <SidebarMenuSubItem key={item.id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={channelRoute === item.id}
                            className="w-full"
                          >
                            <button type="button" onClick={() => onNavigate(`/channels/${encodeURIComponent(item.id)}`)}>
                              <span>{item.label}</span>
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible
                open={modelsExpanded}
                onOpenChange={onToggleModels}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={activeNav === "models"}
                      tooltip="Models"
                    >
                      <Cpu />
                      <span>Models</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {providerNav.map((item) => (
                        <SidebarMenuSubItem key={item.id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={providerRoute === item.id}
                            className="w-full"
                          >
                            <button type="button" onClick={() => onNavigate(`/models/providers/${encodeURIComponent(item.id)}`)}>
                              <span>{item.label}</span>
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {providerNav.length === 0 && (
                        <p className="px-2 py-1 text-xs text-sidebar-foreground/50">No providers detected.</p>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/30 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
              Build
            </div>
            <div className="mt-1 text-sm font-semibold text-sidebar-foreground">
              {versionLabel}
            </div>
            {buildInfo?.time && (
              <div className="mt-1 text-[11px] text-sidebar-foreground/60">
                {buildInfo.time}
                {buildInfo.modified ? " • modified" : ""}
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="text-base font-bold leading-tight">OpenClaw Console</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <Badge
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide",
                loading
                  ? "border-orange-200 bg-orange-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              )}
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              {loading ? "Syncing" : "Ready"}
            </Badge>
            <span className="truncate text-muted-foreground">{apiBase}</span>
          </div>
        </header>

        <div className="flex flex-col gap-3.5 p-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                <pre className="mt-1 overflow-auto rounded-lg bg-destructive/10 p-2.5 text-xs">{error}</pre>
              </AlertDescription>
            </Alert>
          )}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
