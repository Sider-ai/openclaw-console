import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ExtensionInfo } from "../lib/types";

export function useExtensions() {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    void api<{ extensions: ExtensionInfo[] }>("/v1/extensions")
      .then((data) => {
        if (!cancelled) setExtensions(data.extensions);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return { extensions };
}
