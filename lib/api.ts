const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lp_token");
}

export function setSession(token: string, email: string, role: string) {
  localStorage.setItem("lp_token", token);
  localStorage.setItem("lp_email", email);
  localStorage.setItem("lp_role", role);
}

export function getRole(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("lp_role") || "";
}

export function clearSession() {
  localStorage.removeItem("lp_token");
  localStorage.removeItem("lp_email");
  localStorage.removeItem("lp_role");
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.endsWith("/login")) {
    clearSession();
    window.location.href = "/login";
    throw new Error("session expired");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data as T;
}

/* ───────────── Types ───────────── */

export type Plan = {
  id: string;
  name: string;
  rate_per_machine: number;
  max_machines: number;
  trial: boolean;
  description: string;
};

export type License = {
  id: string;
  public_id: string;
  plan: string;
  machine_quota: number;
  custom_rate?: number;
  status: string;
  updates_granted: boolean;
  update_channel: string;
  deployment_url: string;
  trial_expires_at?: string;
  expires_at?: string;
  activated_at?: string;
  last_seen_at?: string;
  product_version?: string;
  amount_paid: boolean;
  created_at: string;
  company_name?: string;
  email?: string;
  machines_used?: number;
};

export const STATUS_COLORS: Record<string, string> = {
  trial: "bg-warn/15 text-warn",
  confirmed: "bg-good/15 text-good",
  suspended: "bg-bad/15 text-bad",
  expired: "bg-bad/15 text-bad",
  revoked: "bg-soft/15 text-soft",
};

export function fmtDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}
