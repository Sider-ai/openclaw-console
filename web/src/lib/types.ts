export type ModelSetting = {
  name: string;
  defaultModel: string;
};

export type BuildInfo = {
  revision?: string;
  time?: string;
  modified: boolean;
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

export type ChannelSummary = {
  name: string;
  channelId: string;
  displayName: string;
  enabled: boolean;
  configured: boolean;
  pluginInstalled: boolean;
  installable: boolean;
};

export type Plugin = {
  id: string;
  name: string;
  version?: string;
  installed: boolean;
  enabled: boolean;
  status?: string;
  origin?: string;
  source?: string;
  channelIds?: string[];
};

export type PluginInstallResult = {
  name: string;
  pluginId: string;
  spec: string;
  installed: boolean;
  restarted: boolean;
  output?: string;
  plugin: Plugin;
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

export type QQBotChannel = {
  name: string;
  channelId: string;
  displayName: string;
  pluginInstalled: boolean;
  pluginVersion?: string;
  pluginStatus?: string;
  pluginSpec: string;
  enabled: boolean;
  configured: boolean;
  appId?: string;
  appIdConfigured: boolean;
  clientSecretConfigured: boolean;
  allowFrom?: string[];
  markdownSupport: boolean;
  imageServerBaseUrl?: string;
  lastAppliedAction?: string;
};

export type WeComAppChannel = {
  name: string;
  channelId: string;
  displayName: string;
  pluginInstalled: boolean;
  pluginVersion?: string;
  pluginStatus?: string;
  pluginSpec: string;
  enabled: boolean;
  configured: boolean;
  corpId?: string;
  corpIdConfigured: boolean;
  corpSecretConfigured: boolean;
  agentId?: string;
  agentIdConfigured: boolean;
  tokenConfigured: boolean;
  encodingAesKeyConfigured: boolean;
  webhookPath?: string;
  apiBaseUrl?: string;
  dmPolicy: string;
  allowFrom?: string[];
  welcomeText?: string;
  lastAppliedAction?: string;
};

export type TelegramPairingEntry = {
  code: string;
  userId: string;
  username?: string;
  firstName?: string;
  requestedAt?: string;
};

export type OpenClawInfo = {
  name: string;
  version: string;
  updateChannel: string;
  latestVersion: string;
  updateAvailable: boolean;
  installKind: string;
};

export type GatewayStatus = {
  name: string;
  runtime: string;
  service: string;
  rpcOk: boolean;
  url: string;
  healthy: boolean;
};

export type NavKey = "setup" | "agents" | "channels" | "tools" | "models";

export type ExtensionInfo = {
  id: string;
  displayName: string;
  icon: string;
  basePath: string;
};
