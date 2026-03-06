import { formatContextWindow } from "../lib/navigation";
import type { CatalogEntry, ModelSetting } from "../lib/types";

type ModelsPageProps = {
  defaultModelInput: string;
  defaultModelUnavailable: string;
  loading: boolean;
  modelOptions: CatalogEntry[];
  modelSetting: ModelSetting | null;
  onDefaultModelChange: (value: string) => void;
  onRefresh: () => Promise<void>;
  onUpdateDefaultModel: () => Promise<void>;
  providerLabel: (providerID: string) => string;
};

export function ModelsPage({
  defaultModelInput,
  defaultModelUnavailable,
  loading,
  modelOptions,
  modelSetting,
  onDefaultModelChange,
  onRefresh,
  onUpdateDefaultModel,
  providerLabel
}: ModelsPageProps) {
  function modelOptionLabel(entry: CatalogEntry): string {
    return `${providerLabel(entry.provider)} | ${entry.displayName || entry.modelKey} | ${entry.input || "-"} | ${formatContextWindow(entry.contextWindow)}`;
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
          <select value={defaultModelInput} onChange={(e) => onDefaultModelChange(e.target.value)} disabled={loading || modelOptions.length === 0}>
            {modelOptions.length === 0 && <option value="">No available models</option>}
            {modelOptions.map((entry) => (
              <option key={`${entry.provider}:${entry.modelKey}`} value={entry.modelKey}>
                {modelOptionLabel(entry)}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => void onUpdateDefaultModel()} disabled={loading || !defaultModelInput.trim() || modelOptions.length === 0}>
            Set Default Model
          </button>
        </div>
        <p className="muted">Only available models are listed. Format: Provider | Display Name | Input | Context Window.</p>
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
