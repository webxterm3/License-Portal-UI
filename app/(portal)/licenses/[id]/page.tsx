"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Check, RefreshCw, KeyRound, Banknote } from "lucide-react";
import { api, fmtDate, fmtINR, STATUS_COLORS } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";

type Detail = {
  license: any;
  customer: any;
  machines: any[];
  history: any[];
  payments: any[];
  quota_requests: any[];
  billing: {
    rate_per_machine: number;
    machines_used: number;
    monthly_cost: number;
    total_paid: number;
    amount_paid_flag: boolean;
  };
};

export default function LicenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [dialog, setDialog] = useState<null | "rotate" | "save" | "payment">(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  // edit form
  const [edit, setEdit] = useState({ machine_quota: "", plan: "", status: "", extend_days: "", reason: "" });
  const [updGranted, setUpdGranted] = useState<boolean | null>(null);
  // payment form
  const [pay, setPay] = useState({ amount: "", method: "bank transfer", reference: "", covers_period: "" });

  const load = useCallback(async () => {
    try {
      const d = await api<Detail>(`/api/admin/licenses/${id}`);
      setData(d);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // summary of pending edits shown in the confirm dialog
  function editSummary(): string {
    const parts: string[] = [];
    if (edit.machine_quota) parts.push(`quota → ${edit.machine_quota}`);
    if (edit.plan) parts.push(`plan → ${edit.plan}`);
    if (edit.status) parts.push(`status → ${edit.status}`);
    if (edit.extend_days) parts.push(`extend by ${edit.extend_days} days`);
    if (updGranted !== null) parts.push(`updates ${updGranted ? "granted" : "revoked"}`);
    return parts.join(" · ");
  }

  const hasEdits = !!(edit.machine_quota || edit.plan || edit.status || edit.extend_days || updGranted !== null);

  async function saveEdit() {
    setDialogBusy(true);
    setMsg("");
    const body: any = { reason: edit.reason };
    if (edit.machine_quota) body.machine_quota = Number(edit.machine_quota);
    if (edit.plan) body.plan = edit.plan;
    if (edit.status) body.status = edit.status;
    if (edit.extend_days) body.extend_days = Number(edit.extend_days);
    if (updGranted !== null) body.updates_granted = updGranted;
    try {
      await api(`/api/admin/licenses/${id}`, { method: "PATCH", body });
      setEdit({ machine_quota: "", plan: "", status: "", extend_days: "", reason: "" });
      setUpdGranted(null);
      setMsg("License updated ✔");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDialogBusy(false);
      setDialog(null);
    }
  }

  async function rotateKey() {
    setDialogBusy(true);
    setMsg("");
    try {
      const r = await api<{ api_key: string }>(`/api/admin/licenses/${id}/rotate-key`, { method: "POST" });
      setNewKey(r.api_key);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDialogBusy(false);
      setDialog(null);
    }
  }

  async function recordPayment() {
    setDialogBusy(true);
    setMsg("");
    try {
      await api(`/api/admin/licenses/${id}/payments`, {
        method: "POST",
        body: { ...pay, amount: Number(pay.amount) },
      });
      setPay({ amount: "", method: "bank transfer", reference: "", covers_period: "" });
      setMsg("Payment recorded ✔");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDialogBusy(false);
      setDialog(null);
    }
  }

  if (error) return <p className="text-sm text-bad">{error}</p>;
  if (!data) return <p className="text-sm text-soft">Loading…</p>;

  const { license: lic, customer: cust, billing } = data;
  // guard against null arrays from the API
  const machines = data.machines || [];
  const history = data.history || [];
  const payments = data.payments || [];

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{cust.company_name}</h1>
          <p className="text-sm text-soft font-mono">
            {lic.public_id} · {cust.email} {cust.phone ? `· ${cust.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill ${STATUS_COLORS[lic.status] || ""}`}>{lic.status}</span>
          <span className="pill bg-bp/15 text-bp capitalize">{lic.plan}</span>
        </div>
      </div>

      {msg && <p className={`text-sm ${msg.includes("✔") ? "text-good" : "text-bad"}`}>{msg}</p>}
      {newKey && (
        <div className="card p-4 border-warn/50">
          <p className="text-[11px] font-mono uppercase tracking-wider text-warn mb-1">New API key — shown once</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-xs break-all">{newKey}</code>
            <button className="btn-ghost !px-3" onClick={() => { navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* entitlement + billing */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-soft mb-2">Machines</p>
          <p className="text-3xl font-bold">
            {billing.machines_used} <span className="text-lg text-soft font-normal">/ {lic.machine_quota}</span>
          </p>
          <div className="mt-3 h-2 rounded-full bg-line overflow-hidden">
            <div
              className={`h-full ${billing.machines_used >= lic.machine_quota ? "bg-bad" : "bg-bp"}`}
              style={{ width: `${Math.min(100, (billing.machines_used / Math.max(1, lic.machine_quota)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-soft mt-2">Hard block at quota — deployment cannot exceed it.</p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-soft mb-2">Billing (plan-based)</p>
          <p className="text-3xl font-bold">{fmtINR(billing.monthly_cost)}<span className="text-sm text-soft font-normal"> /mo</span></p>
          <p className="text-xs text-soft mt-2">
            {lic.machine_quota} machines × {fmtINR(billing.rate_per_machine)} · total paid {fmtINR(billing.total_paid)}
          </p>
          <p className={`text-xs mt-1 ${billing.amount_paid_flag ? "text-good" : "text-bad"}`}>
            {billing.amount_paid_flag ? "amount paid" : "payment outstanding"}
          </p>
        </div>
        <div className="card p-5 text-sm space-y-1.5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-soft mb-2">License</p>
          <p><span className="text-soft">Expires:</span> {fmtDate(lic.trial_expires_at || lic.expires_at)}</p>
          <p><span className="text-soft">Updates:</span> {lic.updates_granted ? `granted (${lic.update_channel || "stable"})` : "not granted"}</p>
          <p><span className="text-soft">Deployment:</span> {lic.deployment_url || "—"}</p>
          <p><span className="text-soft">Last seen:</span> {fmtDate(lic.last_seen_at)} {lic.product_version ? `· v${lic.product_version}` : ""}</p>
        </div>
      </div>

      {/* update license */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Update license</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Machine quota</label>
            <input className="input" type="number" placeholder={String(lic.machine_quota)}
              value={edit.machine_quota} onChange={(e) => setEdit({ ...edit, machine_quota: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Plan</label>
            <select className="input" value={edit.plan} onChange={(e) => setEdit({ ...edit, plan: e.target.value })}>
              <option value="">keep: {lic.plan}</option>
              <option value="community">Community</option>
              <option value="professional">Professional</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Status</label>
            <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              <option value="">keep: {lic.status}</option>
              <option value="trial">trial</option>
              <option value="confirmed">confirmed (paid)</option>
              <option value="suspended">suspended</option>
              <option value="revoked">revoked</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Extend (days)</label>
            <input className="input" type="number" placeholder="e.g. 30"
              value={edit.extend_days} onChange={(e) => setEdit({ ...edit, extend_days: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]"
              checked={updGranted === null ? lic.updates_granted : updGranted}
              onChange={(e) => setUpdGranted(e.target.checked)} />
            Updates granted
          </label>
          <input className="input flex-1 min-w-52" placeholder="Reason (goes to change history)"
            value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} />
        </div>
        <div className="flex gap-3">
          <button className="btn-primary" disabled={!hasEdits} onClick={() => setDialog("save")}>
            <RefreshCw className="h-4 w-4" /> Save changes
          </button>
          <button className="btn-ghost hover:!text-destructive hover:!border-destructive/40" onClick={() => setDialog("rotate")}>
            <KeyRound className="h-4 w-4" /> Rotate API key
          </button>
        </div>
      </div>

      {/* record payment */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Record payment</h2>
        <div className="grid sm:grid-cols-4 gap-4 mb-4">
          <input className="input" type="number" placeholder="Amount (₹)"
            value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
          <input className="input" placeholder="Method"
            value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} />
          <input className="input" placeholder="Reference / UTR"
            value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
          <input className="input" placeholder="Covers period (e.g. Jul 2026)"
            value={pay.covers_period} onChange={(e) => setPay({ ...pay, covers_period: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={() => setDialog("payment")} disabled={!pay.amount}>
          <Banknote className="h-4 w-4" /> Record payment
        </button>
      </div>

      {/* machines */}
      <div className="card overflow-hidden">
        <h2 className="font-semibold px-6 pt-5 pb-3">Machines ({machines.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead><tr><th className="th">Fingerprint</th><th className="th">Name / Tenant</th><th className="th">First seen</th><th className="th">Last heartbeat</th><th className="th">Active</th></tr></thead>
            <tbody>
              {machines.length === 0 ? (
                <tr><td className="td text-soft" colSpan={5}>No machines registered yet.</td></tr>
              ) : machines.map((m) => (
                <tr key={m.id}>
                  <td className="td font-mono text-xs">{m.fingerprint}</td>
                  <td className="td text-soft">{m.name || "—"} {m.tenant_ref ? `· ${m.tenant_ref}` : ""}</td>
                  <td className="td text-soft">{fmtDate(m.first_seen)}</td>
                  <td className="td text-soft">{fmtDate(m.last_heartbeat)}</td>
                  <td className="td">{m.active ? <span className="text-good">yes</span> : <span className="text-soft">no</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* history + payments */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <h2 className="font-semibold px-6 pt-5 pb-3">Change history</h2>
          <div className="max-h-80 overflow-y-auto">
            {history.length === 0 ? (
              <p className="td text-soft block">No changes yet.</p>
            ) : history.map((hst) => (
              <div key={hst.id} className="px-6 py-3 border-b border-line/50 text-sm">
                <p>
                  <span className="font-mono text-xs text-bp">{hst.field}</span>{" "}
                  <span className="text-soft">{hst.old_value || "∅"}</span> → <span>{hst.new_value}</span>
                </p>
                <p className="text-xs text-soft mt-0.5">
                  {fmtDate(hst.changed_at)} · {hst.actor} {hst.reason ? `· ${hst.reason}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="card overflow-hidden">
          <h2 className="font-semibold px-6 pt-5 pb-3">Payments</h2>
          <div className="max-h-80 overflow-y-auto">
            {payments.length === 0 ? (
              <p className="td text-soft block">No payments recorded.</p>
            ) : payments.map((p) => (
              <div key={p.id} className="px-6 py-3 border-b border-line/50 text-sm flex justify-between">
                <div>
                  <p className="font-medium">{fmtINR(p.amount)} <span className="text-xs text-soft">({p.method})</span></p>
                  <p className="text-xs text-soft">{fmtDate(p.paid_at)} {p.covers_period ? `· ${p.covers_period}` : ""}</p>
                </div>
                <p className="text-xs text-soft font-mono">{p.reference}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* save changes */}
      <ConfirmDialog
        open={dialog === "save"}
        busy={dialogBusy}
        title="Apply license changes?"
        description={`${cust.company_name} (${lic.public_id}): ${editSummary() || "no changes"}. The change lands in the license history and the deployment picks it up on its next refresh.`}
        confirmLabel="Apply changes"
        onConfirm={() => saveEdit()}
        onClose={() => setDialog(null)}
      />

      {/* rotate key */}
      <ConfirmDialog
        open={dialog === "rotate"}
        danger
        busy={dialogBusy}
        title="Rotate deployment API key?"
        description={`The current key for ${lic.public_id} stops working immediately. The deployment must be reconfigured with the new key — it is shown only once.`}
        confirmLabel="Rotate key"
        onConfirm={() => rotateKey()}
        onClose={() => setDialog(null)}
      />

      {/* record payment */}
      <ConfirmDialog
        open={dialog === "payment"}
        busy={dialogBusy}
        title="Record payment?"
        description={`Record ${pay.amount ? fmtINR(Number(pay.amount)) : ""} (${pay.method || "—"}) for ${cust.company_name}. This marks the license as paid.`}
        confirmLabel="Record payment"
        onConfirm={() => recordPayment()}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
