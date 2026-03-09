export const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE || "/api").replace(/\/$/, "");

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
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
