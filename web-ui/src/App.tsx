import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { useChannelsData } from "./hooks/useChannelsData";
import { useConsoleData } from "./hooks/useConsoleData";
import { useQQBotChannel } from "./hooks/useQQBotChannel";
import { useTelegramChannel } from "./hooks/useTelegramChannel";
import { channelRouteFromPath, navFromPath, providerRouteFromPath } from "./lib/navigation";
import { ChannelsPage } from "./pages/ChannelsPage";
import { ModelsPage } from "./pages/ModelsPage";
import { OpenAIProviderPage } from "./pages/OpenAIProviderPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ProviderPage } from "./pages/ProviderPage";
import { QQBotChannelPage } from "./pages/QQBotChannelPage";
import { TelegramChannelPage } from "./pages/TelegramChannelPage";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const providerRoute = providerRouteFromPath(location.pathname);
  const channelRoute = channelRouteFromPath(location.pathname);
  const activeNav = navFromPath(location.pathname);

  const consoleData = useConsoleData(providerRoute);
  const channelsData = useChannelsData(activeNav === "channels");
  const telegramChannel = useTelegramChannel(activeNav === "channels" && channelRoute === "telegram", channelsData.refresh);
  const qqbotChannel = useQQBotChannel(activeNav === "channels" && channelRoute === "qqbot", channelsData.refresh);
  const { setModelsExpanded } = consoleData;
  const [channelsExpanded, setChannelsExpanded] = useState(activeNav === "channels");

  let shellError = consoleData.error;
  let shellLoading = consoleData.loading;
  if (activeNav === "channels") {
    shellError = channelRoute === "telegram" ? telegramChannel.error : channelRoute === "qqbot" ? qqbotChannel.error : channelsData.error;
    shellLoading = channelRoute === "telegram" ? telegramChannel.loading : channelRoute === "qqbot" ? qqbotChannel.loading : channelsData.loading;
  }

  useEffect(() => {
    if (activeNav === "models") {
      setModelsExpanded(true);
    }
    if (activeNav === "channels") {
      setChannelsExpanded(true);
    }
  }, [activeNav, setModelsExpanded]);

  return (
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
      onToggleChannels={() => {
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
      }}
      onToggleModels={() => {
        if (activeNav === "models") {
          if (providerRoute !== null) {
            navigate("/models");
            consoleData.setModelsExpanded(true);
            return;
          }
          consoleData.setModelsExpanded((prev) => !prev);
          return;
        }
        navigate("/models");
        consoleData.setModelsExpanded(true);
      }}
      providerNav={consoleData.providerNav}
      providerRoute={providerRoute}
    >
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
        <Route path="/tools" element={<PlaceholderPage description="Tool resources and policy controls will be managed here." title="Tools" />} />
        <Route path="*" element={<Navigate to="/models" replace />} />
      </Routes>
    </AppShell>
  );
}
