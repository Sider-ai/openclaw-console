import { useMemo } from "react";

import { formatContextWindow } from "../lib/navigation";
import type { CatalogEntry, ModelSetting } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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
      <section className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-border/60">
        <h2 className="text-base font-semibold tracking-tight">Models</h2>
        <Separator className="my-2" />
        <p className="text-sm text-muted-foreground">Set the global default model used by OpenClaw from available catalog entries.</p>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-border/60">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold tracking-tight">Default Model</h2>
          <Button variant="outline" onClick={() => void onRefresh()} disabled={loading}>
            Refresh
          </Button>
        </div>
        <Separator className="mb-4" />
        <div className="flex flex-wrap gap-3 items-end">
          <Select
            value={defaultModelProviderInput}
            onValueChange={onDefaultModelProviderChange}
            disabled={loading || providerOptions.length === 0}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="No available providers" />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={defaultModelInput}
            onValueChange={onDefaultModelChange}
            disabled={loading || providerModelOptions.length === 0}
          >
            <SelectTrigger className="w-[400px]">
              <SelectValue placeholder="No available models" />
            </SelectTrigger>
            <SelectContent>
              {providerModelOptions.map((entry) => (
                <SelectItem key={entry.modelKey} value={entry.modelKey}>
                  {modelOptionLabel(entry)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void onUpdateDefaultModel()} disabled={loading || !defaultModelInput.trim() || providerModelOptions.length === 0}>
            Set Default Model
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-3">Choose a provider first, then select one of its available models. Model format: Display Name | Input | Context Window.</p>
        {defaultModelUnavailable && <p className="text-sm text-muted-foreground mt-1">Current default model is unavailable and not listed: {defaultModelUnavailable}</p>}
        <p className="text-sm text-muted-foreground mt-1">Resource: {modelSetting?.name || "modelSettings/default"}</p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">Advanced: Available Model Catalog (raw)</summary>
          <pre className="mt-2 font-mono text-xs bg-muted/50 rounded-xl p-4 border border-border/50 overflow-auto">{JSON.stringify(modelOptions, null, 2)}</pre>
        </details>
      </section>
    </>
  );
}
