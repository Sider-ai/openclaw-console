import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Download, Loader2, RefreshCw } from "lucide-react";

import { api } from "../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ComponentStatus = {
  id: string;
  displayName: string;
  currentVersion: string;
  latestVersion: string;
  status: string;
};

type UpdateLog = {
  timestamp: string;
  message: string;
  level: string;
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "up_to_date":
      return <Badge variant="success">Up to date</Badge>;
    case "update_available":
      return <Badge variant="default">Update available</Badge>;
    case "updating":
      return (
        <Badge variant="secondary">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Updating
        </Badge>
      );
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
}

export function SystemUpdatesPage() {
  const [components, setComponents] = useState<ComponentStatus[]>([]);
  const [logs, setLogs] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [compData, logData] = await Promise.all([
        api<{ components: ComponentStatus[] }>("/v1/extensions/updater/components"),
        api<{ logs: UpdateLog[] }>("/v1/extensions/updater/logs"),
      ]);
      setComponents(compData.components);
      setLogs(logData.logs);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch update status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await api("/v1/extensions/updater/components/check", { method: "POST" });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setChecking(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setUpdatingIds((prev) => new Set(prev).add(id));
    try {
      await api(`/v1/extensions/updater/components/${encodeURIComponent(id)}/update`, { method: "POST" });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleUpdateAll = async () => {
    setUpdatingAll(true);
    try {
      await api("/v1/extensions/updater/components/update-all", { method: "POST" });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update all failed");
    } finally {
      setUpdatingAll(false);
    }
  };

  const hasUpdates = components.some((c) => c.status === "update_available");
  const busy = checking || updatingAll || updatingIds.size > 0;

  return (
    <>
      <Card className="shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">System Updates</CardTitle>
              <CardDescription>
                Manage component versions. Check for new releases and apply updates.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleCheck()}>
                <RefreshCw className={checking ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Check Now
              </Button>
              {hasUpdates && (
                <Button size="sm" disabled={busy} onClick={() => void handleUpdateAll()}>
                  {updatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Update All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card className="shadow-sm ring-1 ring-destructive/40">
          <CardContent className="p-4">
            <pre className="overflow-auto text-xs text-destructive">{error}</pre>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="shadow-sm ring-1 ring-border/60">
          <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        components.map((comp) => (
          <Card key={comp.id} className="shadow-sm ring-1 ring-border/60">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    {comp.status === "up_to_date"
                      ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                      : <Download className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{comp.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {comp.currentVersion || "unknown"}
                      {comp.latestVersion && comp.latestVersion !== comp.currentVersion && (
                        <span className="ml-1">
                          → {comp.latestVersion}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={comp.status} />
                  {comp.status === "update_available" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleUpdate(comp.id)}
                    >
                      {updatingIds.has(comp.id)
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : "Update"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {logs.length > 0 && (
        <Card className="shadow-sm ring-1 ring-border/60">
          <CardHeader>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {logs.map((entry, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="shrink-0 text-muted-foreground">{entry.timestamp}</span>
                  <span className={entry.level === "error" ? "text-destructive" : "text-foreground"}>
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
