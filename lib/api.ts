/* ─── Products ───────────────────────────────────────────────────── */
// PAM and EPM share one backend/database; every /api/admin/* call sends
// X-Product so the backend knows which product's data to scope to.
export type ProductId = "pam" | "epm";

export type ProductDef = {
  id: ProductId;
  label: string;      // short name shown in nav/breadcrumbs
  fullName: string;    // full expansion shown on the chooser card
  description: string;
};

export const PRODUCTS: Record<ProductId, ProductDef> = {
  pam: {
    id: "pam",
    label: "PAM Licensing",
    fullName: "Privileged Access Management",
    description: "Issue and manage licenses for WebXTerm's core PAM product — agent-based server access, session recording, RBAC.",
  },
  epm: {
    id: "epm",
    label: "EPM Licensing",
    fullName: "Endpoint Privilege Management",
    description: "Issue and manage licenses for WebXTerm EPM — endpoint privilege elevation and application control.",
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function getProduct(): ProductId | null {
  if (typeof window === "undefined") return null;
  const p = localStorage.getItem("lp_product");
  return p === "pam" || p === "epm" ? p : null;
}

export function setProduct(id: ProductId) {
  localStorage.setItem("lp_product", id);
}

export function clearProduct() {
  localStorage.removeItem("lp_product");
}

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
  clearProduct();
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const product = getProduct();
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      // Absent before a product is chosen (e.g. during /login).
      ...(product ? { "X-Product": product } : {}),
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
  product?: "pam" | "epm";
  public_id: string;
  plan: string;
  machine_quota: number;
  custom_rate?: number;
  status: string;
  updates_granted: boolean;
  update_channel: string;
  deployment_url: string;
  api_key_hash: string; // sha256 of the deployment API key — never the plaintext
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
