import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { useConsoleData } from "./hooks/useConsoleData";
import { navFromPath, providerRouteFromPath } from "./lib/navigation";
import { ModelsPage } from "./pages/ModelsPage";
import { OpenAIProviderPage } from "./pages/OpenAIProviderPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ProviderPage } from "./pages/ProviderPage";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const providerRoute = providerRouteFromPath(location.pathname);
  const activeNav = navFromPath(location.pathname);

  const consoleData = useConsoleData(providerRoute);
  const { setModelsExpanded } = consoleData;

  useEffect(() => {
    if (activeNav === "models") {
      setModelsExpanded(true);
    }
  }, [activeNav, setModelsExpanded]);

  return (
    <AppShell
      activeNav={activeNav}
      apiBase={consoleData.apiBase}
      error={consoleData.error}
      loading={consoleData.loading}
      modelsExpanded={consoleData.modelsExpanded}
      onNavigate={navigate}
      onToggleModels={() => {
        if (activeNav === "models") {
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
        <Route
          path="/"
          element={<Navigate to="/models" replace />}
        />
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
        <Route
          path="/agents"
          element={<PlaceholderPage description="Agent resources will be managed here. API hooks can be added in the next iteration." title="Agents" />}
        />
        <Route
          path="/channels"
          element={<PlaceholderPage description="Channel resources (Telegram, Slack, etc.) will be configured here." title="Channels" />}
        />
        <Route
          path="/tools"
          element={<PlaceholderPage description="Tool resources and policy controls will be managed here." title="Tools" />}
        />
        <Route
          path="*"
          element={<Navigate to="/models" replace />}
        />
      </Routes>
    </AppShell>
  );
}
