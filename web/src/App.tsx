import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { useAuth } from "./hooks/useAuth";
import { useChannelsData } from "./hooks/useChannelsData";
import { useConfirmDialog } from "./hooks/useConfirmDialog";
import { useConsoleData } from "./hooks/useConsoleData";
import { useQQBotChannel } from "./hooks/useQQBotChannel";
import { useTelegramChannel } from "./hooks/useTelegramChannel";
import { useTelegramPairings } from "./hooks/useTelegramPairings";
import { useWeComAppChannel } from "./hooks/useWeComAppChannel";
import { channelRouteFromPath, navFromPath, providerRouteFromPath } from "./lib/navigation";

const ChannelsPage = lazy(() => import("./pages/ChannelsPage").then((m) => ({ default: m.ChannelsPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const ModelsPage = lazy(() => import("./pages/ModelsPage").then((m) => ({ default: m.ModelsPage })));
const OpenAIProviderPage = lazy(() => import("./pages/OpenAIProviderPage").then((m) => ({ default: m.OpenAIProviderPage })));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage").then((m) => ({ default: m.PlaceholderPage })));
const ProviderPage = lazy(() => import("./pages/ProviderPage").then((m) => ({ default: m.ProviderPage })));
const QQBotChannelPage = lazy(() => import("./pages/QQBotChannelPage").then((m) => ({ default: m.QQBotChannelPage })));
const TelegramChannelPage = lazy(() => import("./pages/TelegramChannelPage").then((m) => ({ default: m.TelegramChannelPage })));
const WeComAppChannelPage = lazy(() => import("./pages/WeComAppChannelPage").then((m) => ({ default: m.WeComAppChannelPage })));

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const providerRoute = providerRouteFromPath(location.pathname);
  const channelRoute = channelRouteFromPath(location.pathname);
  const activeNav = navFromPath(location.pathname);

  const { token, login } = useAuth();
  const [requiresAuth, setRequiresAuth] = useState(false);

  const { requestConfirm, confirmDialogNode } = useConfirmDialog();

  const consoleData = useConsoleData(providerRoute, { requestConfirm });
  const channelsData = useChannelsData(activeNav === "channels");
  const telegramChannel = useTelegramChannel(activeNav === "channels" && channelRoute === "telegram", channelsData.refresh, { requestConfirm });
  const telegramPairings = useTelegramPairings(
    activeNav === "channels" && channelRoute === "telegram" &&
    (telegramChannel.channel?.dmPolicy === "pairing" || telegramChannel.form.dmPolicy === "pairing")
  );
  const qqbotChannel = useQQBotChannel(activeNav === "channels" && channelRoute === "qqbot", channelsData.refresh);
  const wecomAppChannel = useWeComAppChannel(activeNav === "channels" && channelRoute === "wecom-app", channelsData.refresh);
  const { setModelsExpanded } = consoleData;
  const [channelsExpanded, setChannelsExpanded] = useState(activeNav === "channels");

  let shellError = consoleData.error;
  let shellLoading = consoleData.loading;
  if (activeNav === "channels") {
    shellError = channelRoute === "telegram" ? telegramChannel.error : channelRoute === "qqbot" ? qqbotChannel.error : channelRoute === "wecom-app" ? wecomAppChannel.error : channelsData.error;
    shellLoading = channelRoute === "telegram" ? telegramChannel.loading : channelRoute === "qqbot" ? qqbotChannel.loading : channelRoute === "wecom-app" ? wecomAppChannel.loading : channelsData.loading;
  }

  useEffect(() => {
    const handler = () => setRequiresAuth(true);
    window.addEventListener("openclaw:unauthorized", handler);
    return () => window.removeEventListener("openclaw:unauthorized", handler);
  }, []);

  useEffect(() => {
    if (activeNav === "models") {
      setModelsExpanded(true);
    }
    if (activeNav === "channels") {
      setChannelsExpanded(true);
    }
  }, [activeNav, setModelsExpanded]);

  const onToggleChannels = useCallback(() => {
    if (activeNav === "channels") {
      if (channelRoute !== null) {
        navigate("/channels");
        setChannelsExpanded(true);
        return;
      }
      setChannelsExpanded((prev) => !prev);
      return;
    }
    navigate("/channels");
    setChannelsExpanded(true);
  }, [activeNav, channelRoute, navigate]);

  const onToggleModels = useCallback(() => {
    if (activeNav === "models") {
      if (providerRoute !== null) {
        navigate("/models");
        setModelsExpanded(true);
        return;
      }
      setModelsExpanded((prev) => !prev);
      return;
    }
    navigate("/models");
    setModelsExpanded(true);
  }, [activeNav, providerRoute, navigate, setModelsExpanded]);

  if (requiresAuth && !token) {
    return (
      <Suspense fallback={null}>
        <LoginPage onLogin={(t) => {
          login(t);
          window.location.reload();
        }} />
      </Suspense>
    );
  }

  return (
    <>
      <AppShell
        activeNav={activeNav}
        apiBase={consoleData.apiBase}
        channelNav={channelsData.channelNav}
        channelRoute={channelRoute}
        channelsExpanded={channelsExpanded}
        error={shellError}
        loading={shellLoading}
        modelsExpanded={consoleData.modelsExpanded}
        onNavigate={navigate}
        onToggleChannels={onToggleChannels}
        onToggleModels={onToggleModels}
        providerNav={consoleData.providerNav}
        providerRoute={providerRoute}
      >
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/models" replace />} />
            <Route
              path="/models"
              element={
                <ModelsPage
                  defaultModelProviderInput={consoleData.defaultModelProviderInput}
                  defaultModelInput={consoleData.defaultModelInput}
                  defaultModelUnavailable={consoleData.defaultModelUnavailable}
                  loading={consoleData.loading}
                  modelOptions={consoleData.modelOptions}
                  modelSetting={consoleData.modelSetting}
                  onDefaultModelChange={consoleData.selectDefaultModel}
                  onDefaultModelProviderChange={consoleData.selectDefaultModelProvider}
                  onRefresh={consoleData.refresh}
                  onUpdateDefaultModel={consoleData.updateDefaultModel}
                  providerLabel={consoleData.providerLabel}
                />
              }
            />
            <Route
              path="/models/providers/openai"
              element={
                <OpenAIProviderPage
                  apiKey={consoleData.apiKey}
                  codexProvider={consoleData.codexProvider}
                  codexSession={consoleData.codexSession}
                  inProgress={consoleData.inProgress}
                  loading={consoleData.loading}
                  onApiKeyChange={consoleData.setAPIKey}
                  onCancelSession={consoleData.cancelSession}
                  onConnectAPIKey={() => {
                    void consoleData.connectAPIKey("openai");
                  }}
                  onDisconnectOpenAI={() => {
                    void consoleData.disconnectProvider("openai");
                  }}
                  onDisconnectCodex={() => {
                    void consoleData.disconnectProvider("openai-codex");
                  }}
                  onRedirectURLChange={consoleData.setRedirectURL}
                  onStartSession={consoleData.startCodexSession}
                  onSubmitRedirect={consoleData.submitRedirect}
                  openaiProvider={consoleData.openaiProvider}
                  redirectURL={consoleData.redirectURL}
                />
              }
            />
            <Route
              path="/models/providers/:providerId"
              element={
                providerRoute && providerRoute !== "openai" ? (
                  <ProviderPage
                    apiKey={consoleData.apiKey}
                    loading={consoleData.loading}
                    onApiKeyChange={consoleData.setAPIKey}
                    onConnectAPIKey={() => {
                      void consoleData.connectAPIKey(providerRoute);
                    }}
                    onDisconnect={() => {
                      void consoleData.disconnectProvider(providerRoute);
                    }}
                    providerID={providerRoute}
                    providerNav={consoleData.providerNav}
                    providerStatus={consoleData.providerStatus}
                  />
                ) : (
                  <Navigate to="/models" replace />
                )
              }
            />
            <Route path="/agents" element={<PlaceholderPage description="Agent resources will be managed here. API hooks can be added in the next iteration." title="Agents" />} />
            <Route path="/channels" element={<ChannelsPage channels={channelsData.channels} onOpenChannel={(id) => navigate(`/channels/${encodeURIComponent(id)}`)} />} />
            <Route
              path="/channels/telegram"
              element={
                <TelegramChannelPage
                  channel={telegramChannel.channel}
                  form={telegramChannel.form}
                  isDirty={telegramChannel.isDirty}
                  loading={telegramChannel.loading}
                  onDisconnect={telegramChannel.disconnect}
                  onFormChange={telegramChannel.setForm}
                  onRefresh={telegramChannel.refresh}
                  onSave={telegramChannel.save}
                  onTestConnection={telegramChannel.testConnection}
                  testResult={telegramChannel.testResult}
                  pairings={telegramPairings.pairings}
                  pairingLoading={telegramPairings.loading}
                  pairingError={telegramPairings.error}
                  onApprovePairing={telegramPairings.approve}
                  onRejectPairing={telegramPairings.reject}
                  onRefreshPairings={telegramPairings.refresh}
                />
              }
            />
            <Route
              path="/channels/qqbot"
              element={
                <QQBotChannelPage
                  channel={qqbotChannel.channel}
                  form={qqbotChannel.form}
                  installResult={qqbotChannel.installResult}
                  isDirty={qqbotChannel.isDirty}
                  loading={qqbotChannel.loading}
                  onDisconnect={qqbotChannel.disconnect}
                  onFormChange={qqbotChannel.setForm}
                  onInstallPlugin={qqbotChannel.installPlugin}
                  onRefresh={qqbotChannel.refresh}
                  onSave={qqbotChannel.save}
                />
              }
            />
            <Route
              path="/channels/wecom-app"
              element={
                <WeComAppChannelPage
                  channel={wecomAppChannel.channel}
                  form={wecomAppChannel.form}
                  installResult={wecomAppChannel.installResult}
                  isDirty={wecomAppChannel.isDirty}
                  loading={wecomAppChannel.loading}
                  onDisconnect={wecomAppChannel.disconnect}
                  onFormChange={wecomAppChannel.setForm}
                  onInstallPlugin={wecomAppChannel.installPlugin}
                  onRefresh={wecomAppChannel.refresh}
                  onSave={wecomAppChannel.save}
                />
              }
            />
            <Route path="/tools" element={<PlaceholderPage description="Tool resources and policy controls will be managed here." title="Tools" />} />
            <Route path="*" element={<Navigate to="/models" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      {confirmDialogNode}
    </>
  );
}
