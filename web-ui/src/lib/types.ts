export type ModelSetting = {
  name: string;
  defaultModel: string;
};

export type Provider = {
  name: string;
  providerId: string;
  supportsApiKey: boolean;
  connection: string;
  authType: string;
  profileLabels?: string[];
};

export type ProviderSummary = {
  name: string;
  providerId: string;
  displayName: string;
  supportsApiKey: boolean;
  managed: boolean;
};

export type ModelProviderNav = {
  id: string;
  label: string;
};

export type ChannelNav = {
  id: string;
  label: string;
};

export type CatalogEntry = {
  name: string;
  modelKey: string;
  displayName: string;
  provider: string;
  input: string;
  contextWindow: number;
  available: boolean;
  tags?: string[];
};

export type CodexSession = {
  name: string;
  sessionId: string;
  state: string;
  authUrl?: string;
  expiresAt: number;
  errorCode?: string;
  errorMessage?: string;
};

export type TelegramChannel = {
  name: string;
  channelId: string;
  displayName: string;
  enabled: boolean;
  configured: boolean;
  mode: string;
  botTokenConfigured: boolean;
  dmPolicy: string;
  allowFrom?: string[];
  groupPolicy: string;
  requireMention: boolean;
  webhookUrlConfigured: boolean;
  lastAppliedAction?: string;
};

export type TelegramChannelTestResult = {
  name: string;
  channelId: string;
  ok: boolean;
  message: string;
  botId?: number;
  botUsername?: string;
  botFirstName?: string;
};

export type NavKey = "agents" | "channels" | "tools" | "models";
