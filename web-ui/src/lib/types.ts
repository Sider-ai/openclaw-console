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

export type NavKey = "agents" | "channels" | "tools" | "models";
