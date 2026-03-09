export const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE || (import.meta.env.BASE_URL + "api").replace("//", "/")).replace(/\/$/, "");

const TOKEN_KEY = "openclaw_auth_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {})
  };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });

  if (res.status === 401) {
    clearAuthToken();
    window.dispatchEvent(new Event("openclaw:unauthorized"));
    throw new UnauthorizedError();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { detail?: string })?.detail
      || (data as { title?: string })?.title
      || `HTTP ${res.status}`
    );
  }
  return data as T;
}
