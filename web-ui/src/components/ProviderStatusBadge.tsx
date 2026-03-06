import type { Provider } from "../lib/types";
import { Badge } from "@/components/ui/badge";

export function ProviderStatusBadge({ provider }: { provider: Provider | null }) {
  const connected = provider?.connection === "CONNECTED";
  return connected ? (
    <Badge className="bg-green-500 text-white hover:bg-green-600">Connected</Badge>
  ) : (
    <Badge variant="secondary">Not Configured</Badge>
  );
}
