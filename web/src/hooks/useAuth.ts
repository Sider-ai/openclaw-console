import { useCallback, useState } from "react";

import { clearAuthToken, getAuthToken, setAuthToken } from "../lib/api";

export function useAuth() {
  const [token, setToken] = useState<string | null>(getAuthToken);

  const login = useCallback((newToken: string) => {
    setAuthToken(newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
  }, []);

  return { token, login, logout };
}
