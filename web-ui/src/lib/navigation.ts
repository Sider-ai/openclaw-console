import type { ModelProviderNav, NavKey, ProviderSummary } from "./types";

export const DOCS_PROVIDER_ROOT = "https://docs.openclaw.ai/providers";

export const ROOT_NAV_ITEMS: { key: Exclude<NavKey, "models">; label: string; path: string }[] = [
  { key: "agents", label: "Agents", path: "/agents" },
  { key: "channels", label: "Channels", path: "/channels" },
  { key: "tools", label: "Tools", path: "/tools" }
];

export function fallbackProviderLabel(providerId: string): string {
  const parts = providerId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return parts.join(" ") || providerId;
}

export function buildModelProviderNav(providers: ProviderSummary[]): ModelProviderNav[] {
  const byID = new Map<string, ProviderSummary>();
  providers.forEach((item) => byID.set(item.providerId, item));

  const out: ModelProviderNav[] = [];
  const hasOpenAI = byID.has("openai") || byID.has("openai-codex");

  if (hasOpenAI) {
    out.push({ id: "openai", label: "OpenAI" });
  }

  const sorted = [...providers].sort((a, b) => a.displayName.localeCompare(b.displayName));
  sorted.forEach((item) => {
    if (item.providerId === "openai-codex") {
      return;
    }
    if (item.providerId === "openai" && hasOpenAI) {
      return;
    }
    out.push({
      id: item.providerId,
      label: item.displayName || fallbackProviderLabel(item.providerId)
    });
  });

  return out;
}

export function providerDocsURL(provider: string): string {
  if (provider === "openai") {
    return `${DOCS_PROVIDER_ROOT}/openai`;
  }
  return DOCS_PROVIDER_ROOT;
}

export function providerRouteFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/models\/providers\/([^/]+)\/?$/);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

export function navFromPath(pathname: string): NavKey {
  if (pathname.startsWith("/agents")) {
    return "agents";
  }
  if (pathname.startsWith("/channels")) {
    return "channels";
  }
  if (pathname.startsWith("/tools")) {
    return "tools";
  }
  return "models";
}

export function formatContextWindow(windowSize: number): string {
  if (!windowSize || windowSize <= 0) {
    return "-";
  }
  if (windowSize >= 1000) {
    return `${Math.round(windowSize / 1000)}k`;
  }
  return String(windowSize);
}

export function providerFromModelKey(modelKey: string): string {
  const [provider = ""] = modelKey.split("/", 1);
  return provider.trim();
}
