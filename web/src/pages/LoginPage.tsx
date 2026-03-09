import { FormEvent, useState } from "react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { API_BASE } from "../lib/api";

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    setError("");
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/v1/providers`, {
        headers: { "Authorization": `Bearer ${trimmed}` }
      });
      if (res.status === 401) {
        setError("Invalid token");
        return;
      }
      onLogin(trimmed);
    } catch {
      setError("Unable to reach server");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>OpenClaw Console</CardTitle>
          <CardDescription>Enter your access token to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Enter token"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError("");
                }}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={!value.trim() || checking}>
              {checking ? "Verifying..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
