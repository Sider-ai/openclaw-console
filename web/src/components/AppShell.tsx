import type { PropsWithChildren } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Bot, ChevronDown, ChevronRight, Cpu, MessageSquare, Wrench } from "lucide-react";

import { ROOT_NAV_ITEMS } from "../lib/navigation";
import type { ChannelNav, ModelProviderNav, NavKey } from "../lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Shared class helpers for nav items
const NAV_ITEM_BASE = "w-full rounded-[9px] border px-3 py-2.5 text-sm font-semibold";
const NAV_ITEM_ACTIVE = "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-50";
const NAV_ITEM_INACTIVE = "border-border bg-background text-foreground hover:border-border hover:bg-muted/60";

const SUBNAV_ITEM_BASE = "w-full justify-start rounded-[8px] border px-2.5 py-2 text-sm";
const SUBNAV_ITEM_ACTIVE = "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-50";
const SUBNAV_ITEM_INACTIVE = "border-border bg-background text-foreground hover:border-border hover:bg-muted/60";

function navItemClass(active: boolean): string {
  return cn(NAV_ITEM_BASE, "justify-start", active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE);
}

function navGroupTriggerClass(active: boolean): string {
  return cn(NAV_ITEM_BASE, "justify-between", active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE);
}

function subNavItemClass(active: boolean): string {
  return cn(SUBNAV_ITEM_BASE, active ? SUBNAV_ITEM_ACTIVE : SUBNAV_ITEM_INACTIVE);
}

const ROOT_NAV_ICONS: Record<string, LucideIcon> = {
  agents: Bot,
  tools: Wrench
};

function NavChevron({ expanded }: { expanded: boolean }) {
  const Icon = expanded ? ChevronDown : ChevronRight;
  return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
}

type AppShellProps = PropsWithChildren<{
  activeNav: NavKey;
  apiBase: string;
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
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-gray-300 bg-gray-100 text-sm font-bold tracking-wide">
            OC
          </span>
          <div>
            <div className="text-[17px] font-bold leading-tight">OpenClaw Console</div>
            <div className="text-xs text-muted-foreground">Console Workspace</div>
          </div>
        </div>
        <div className="flex max-w-[55%] items-center gap-2.5 overflow-hidden text-xs">
          <Badge
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide",
              loading
                ? "border-orange-200 bg-orange-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {loading ? "Syncing" : "Ready"}
          </Badge>
          <span className="truncate text-muted-foreground">{apiBase}</span>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto w-full max-w-[1400px] flex-1 grid grid-cols-[230px_minmax(0,1fr)] gap-4 p-3.5 max-lg:grid-cols-1 max-sm:p-3">
        {/* Sidebar */}
        <aside className="sticky top-[74px] flex h-fit flex-col gap-3.5 rounded-[14px] border border-border bg-muted/40 p-4 shadow-sm max-lg:static">
          <div className="text-sm font-bold tracking-wide text-foreground">OpenClaw</div>
          <nav className="flex flex-col gap-2 max-lg:grid max-lg:grid-cols-2 max-sm:grid-cols-1">
            {ROOT_NAV_ITEMS.map((item) => {
              const Icon = ROOT_NAV_ICONS[item.key];
              return (
                <Button
                  key={item.key}
                  variant="ghost"
                  className={navItemClass(activeNav === item.key)}
                  onClick={() => onNavigate(item.path)}
                  type="button"
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {item.label}
                </Button>
              );
            })}

            {/* Channels collapsible group */}
            <Collapsible
              open={channelsExpanded}
              onOpenChange={onToggleChannels}
              className="col-span-full flex flex-col gap-2"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={navGroupTriggerClass(activeNav === "channels")}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    Channels
                  </span>
                  <NavChevron expanded={channelsExpanded} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-1.5 pl-2.5 max-sm:pl-0">
                {channelNav.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={subNavItemClass(channelRoute === item.id)}
                    onClick={() => onNavigate(`/channels/${encodeURIComponent(item.id)}`)}
                    type="button"
                  >
                    {item.label}
                  </Button>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Models collapsible group */}
            <Collapsible
              open={modelsExpanded}
              onOpenChange={onToggleModels}
              className="col-span-full flex flex-col gap-2"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={navGroupTriggerClass(activeNav === "models")}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 shrink-0" />
                    Models
                  </span>
                  <NavChevron expanded={modelsExpanded} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-1.5 pl-2.5 max-sm:pl-0">
                {providerNav.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={subNavItemClass(providerRoute === item.id)}
                    onClick={() => onNavigate(`/models/providers/${encodeURIComponent(item.id)}`)}
                    type="button"
                  >
                    {item.label}
                  </Button>
                ))}
                {providerNav.length === 0 && (
                  <p className="px-0.5 text-[13px] text-muted-foreground">No providers detected.</p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </nav>
        </aside>

        {/* Main workspace */}
        <main className="flex min-w-0 flex-col gap-3.5">
          {error && (
            <section className="rounded-[14px] border border-red-200 bg-red-50 p-4 shadow-sm">
              <h2 className="mb-2.5 text-[17px] font-semibold">Error</h2>
              <pre className="mt-2.5 overflow-auto rounded-[10px] border border-border bg-gray-50 p-2.5 text-xs">{error}</pre>
            </section>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
