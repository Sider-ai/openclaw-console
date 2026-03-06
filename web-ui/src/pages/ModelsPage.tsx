import { useMemo } from "react";

import { formatContextWindow } from "../lib/navigation";
import type { CatalogEntry, ModelSetting } from "../lib/types";

type ModelsPageProps = {
  defaultModelProviderInput: string;
  defaultModelInput: string;
  defaultModelUnavailable: string;
  loading: boolean;
  modelOptions: CatalogEntry[];
  modelSetting: ModelSetting | null;
  onDefaultModelChange: (value: string) => void;
  onDefaultModelProviderChange: (value: string) => void;
  onRefresh: () => Promise<void>;
  onUpdateDefaultModel: () => Promise<void>;
  providerLabel: (providerID: string) => string;
};

export function ModelsPage({
  defaultModelProviderInput,
  defaultModelInput,
  defaultModelUnavailable,
  loading,
  modelOptions,
  modelSetting,
  onDefaultModelChange,
  onDefaultModelProviderChange,
  onRefresh,
  onUpdateDefaultModel,
  providerLabel
}: ModelsPageProps) {
  const providerOptions = useMemo(
    () =>
      Array.from(new Set(modelOptions.map((entry) => entry.provider))).map((providerID) => ({
        value: providerID,
        label: providerLabel(providerID)
      })),
    [modelOptions, providerLabel]
  );

  const providerModelOptions = useMemo(
    () => modelOptions.filter((entry) => entry.provider === defaultModelProviderInput),
    [defaultModelProviderInput, modelOptions]
  );

  function modelOptionLabel(entry: CatalogEntry): string {
    return `${entry.displayName || entry.modelKey} | ${entry.input || "-"} | ${formatContextWindow(entry.contextWindow)}`;
  }

  return (
    <>
      <section className="panel">
        <h2>Models</h2>
        <p className="muted">Set the global default model used by OpenClaw from available catalog entries.</p>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h2>Default Model</h2>
          <button className="btn btn-secondary" onClick={() => void onRefresh()} disabled={loading}>
            Refresh
          </button>
        </div>
        <div className="form-row">
          <select value={defaultModelProviderInput} onChange={(e) => onDefaultModelProviderChange(e.target.value)} disabled={loading || providerOptions.length === 0}>
            {providerOptions.length === 0 && <option value="">No available providers</option>}
            {providerOptions.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
          <select value={defaultModelInput} onChange={(e) => onDefaultModelChange(e.target.value)} disabled={loading || providerModelOptions.length === 0}>
            {providerModelOptions.length === 0 && <option value="">No available models</option>}
            {providerModelOptions.map((entry) => (
              <option key={entry.modelKey} value={entry.modelKey}>
                {modelOptionLabel(entry)}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => void onUpdateDefaultModel()} disabled={loading || !defaultModelInput.trim() || providerModelOptions.length === 0}>
            Set Default Model
          </button>
        </div>
        <p className="muted">Choose a provider first, then select one of its available models. Model format: Display Name | Input | Context Window.</p>
        {defaultModelUnavailable && <p className="muted">Current default model is unavailable and not listed: {defaultModelUnavailable}</p>}
        <p className="muted">Resource: {modelSetting?.name || "modelSettings/default"}</p>
        <details>
          <summary>Advanced: Available Model Catalog (raw)</summary>
          <pre>{JSON.stringify(modelOptions, null, 2)}</pre>
        </details>
      </section>
    </>
  );
}
