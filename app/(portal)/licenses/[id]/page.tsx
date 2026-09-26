"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Check, RefreshCw, KeyRound, Banknote, ArrowUpCircle, ArrowDownCircle, Eye, EyeOff } from "lucide-react";
import { api, fmtDate, fmtINR, STATUS_COLORS, Plan } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";

// Tier order for labeling a plan change as an upgrade or a demotion — same
// order as the backend's ProductPlanOrder.
const PLAN_RANK: Record<string, number> = { community: 0, professional: 1, enterprise: 2 };

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
  const [showHash, setShowHash] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);
  const [dialog, setDialog] = useState<null | "rotate" | "save" | "payment" | "upgrade" | "status">(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  // edit form — quota (either direction) + extend + updates; plan/status live elsewhere
  const [edit, setEdit] = useState({ machine_quota: "", extend_days: "", deployment_url: "", reason: "" });
  const [updGranted, setUpdGranted] = useState<boolean | null>(null);
  // payment form
  const [pay, setPay] = useState({ amount: "", method: "bank transfer", reference: "", covers_period: "" });
  // upgrade plan
  const [plans, setPlans] = useState<Plan[]>([]);
  const [upgrade, setUpgrade] = useState({ plan: "", machine_quota: "", reason: "" });
  // suspend / reactivate / revoke
  const [statusAction, setStatusAction] = useState({ status: "", reason: "" });

  useEffect(() => {
    api<{ plans: Plan[] }>("/api/admin/plans").then((r) => setPlans(r.plans)).catch(() => {});
  }, []);

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
    if (edit.extend_days) parts.push(`extend by ${edit.extend_days} days`);
    if (edit.deployment_url) parts.push(`deployment URL → ${edit.deployment_url}`);
    if (updGranted !== null) parts.push(`updates ${updGranted ? "granted" : "revoked"}`);
    return parts.join(" · ");
  }

  const hasEdits = !!(edit.machine_quota || edit.extend_days || edit.deployment_url || updGranted !== null);

  async function saveEdit() {
    setDialogBusy(true);
    setMsg("");
    const body: any = { reason: edit.reason };
    if (edit.machine_quota) body.machine_quota = Number(edit.machine_quota);
    if (edit.extend_days) body.extend_days = Number(edit.extend_days);
    if (edit.deployment_url) body.deployment_url = edit.deployment_url;
    if (updGranted !== null) body.updates_granted = updGranted;
    try {
      await api(`/api/admin/licenses/${id}`, { method: "PATCH", body });
      setEdit({ machine_quota: "", extend_days: "", deployment_url: "", reason: "" });
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

  async function upgradeLicense() {
    setDialogBusy(true);
    setMsg("");
    try {
      const r = await api<{ api_key: string }>(`/api/admin/licenses/${id}/upgrade`, {
        method: "POST",
        body: {
          plan: upgrade.plan,
          machine_quota: Number(upgrade.machine_quota) || 0,
          reason: upgrade.reason,
        },
      });
      setNewKey(r.api_key);
      setUpgrade({ plan: "", machine_quota: "", reason: "" });
      setMsg("License upgraded ✔ — new API key shown below, previous one now inactive");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDialogBusy(false);
      setDialog(null);
    }
  }

  async function applyStatus() {
    setDialogBusy(true);
    setMsg("");
    try {
      await api(`/api/admin/licenses/${id}/status`, { method: "POST", body: statusAction });
      setMsg(`License ${statusAction.status} ✔`);
      setStatusAction({ status: "", reason: "" });
      load();
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
  const currentPlanDef = plans.find((p) => p.id === lic.plan);
  const currentRank = PLAN_RANK[lic.plan] ?? 0;
  const upgradeIsDemotion = !!upgrade.plan && (PLAN_RANK[upgrade.plan] ?? 0) < currentRank;

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
          <div className="pt-1.5 border-t border-line/50 mt-1.5">
            <p className="text-soft mb-1">Current API key (sha256 hash — never the plaintext):</p>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 bg-paper border border-line rounded-lg px-2 py-1 text-[11px] break-all">
                {showHash ? lic.api_key_hash : "•".repeat(24)}
              </code>
              <button className="btn-ghost !px-2 !py-1" title={showHash ? "Hide" : "View"} onClick={() => setShowHash((s) => !s)}>
                {showHash ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button className="btn-ghost !px-2 !py-1" title="Copy"
                onClick={() => { navigator.clipboard.writeText(lic.api_key_hash); setHashCopied(true); setTimeout(() => setHashCopied(false), 1500); }}>
                {hashCopied ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-soft mt-1">
              Hash the customer's LICENSE_API_KEY the same way (sha256, hex) and compare — confirms which key their deployment actually has without ever seeing it in plaintext again.
            </p>
          </div>
        </div>
      </div>

      {/* upgrade plan */}
      <div className="card p-6 border-bp/40">
        <h2 className="font-semibold mb-1">Upgrade plan</h2>
        <p className="text-xs text-soft mb-4">
          Changes the plan tier. Login stays the same — the deployment API key rotates and a new one is emailed.
        </p>
        {currentRank >= Math.max(...Object.values(PLAN_RANK)) && (
          <p className="text-xs text-soft mb-3">
            Already on <b className="capitalize">{lic.plan}</b> — the top tier. You can only demote below.
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {plans.filter((p) => p.id !== lic.plan).map((p) => {
            const isUpgrade = (PLAN_RANK[p.id] ?? 0) > currentRank;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setUpgrade({ ...upgrade, plan: p.id, machine_quota: p.max_machines > 0 ? String(p.max_machines) : "" })}
                className={`card p-4 text-left transition-colors ${
                  upgrade.plan === p.id ? "border-bp bg-bpdeep/10" : "hover:border-bp/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{p.name}</span>
                  <span className={`pill ${isUpgrade ? "bg-good/15 text-good" : "bg-warn/15 text-warn"}`}>
                    {isUpgrade ? "↑ upgrade" : "↓ demote"}
                  </span>
                </div>
                <p className="text-xs text-soft">{p.description}</p>
              </button>
            );
          })}
        </div>
        {upgrade.plan && (
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">
                Machine quota *{" "}
                {(() => {
                  const p = plans.find((x) => x.id === upgrade.plan);
                  return p && p.max_machines > 0 ? `(max ${p.max_machines})` : "";
                })()}
              </label>
              <input className="input" type="number" min={1} value={upgrade.machine_quota}
                onChange={(e) => setUpgrade({ ...upgrade, machine_quota: e.target.value })} placeholder="required" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Reason (optional)</label>
              <input className="input" value={upgrade.reason}
                onChange={(e) => setUpgrade({ ...upgrade, reason: e.target.value })} placeholder="goes to change history" />
            </div>
          </div>
        )}
        <button className="btn-primary" disabled={!upgrade.plan || !upgrade.machine_quota} onClick={() => setDialog("upgrade")}>
          {upgradeIsDemotion ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
          {upgradeIsDemotion ? "Demote license" : "Upgrade license"}
        </button>
      </div>

      {/* update license */}
      <div className="card p-6">
        <h2 className="font-semibold mb-1">Update license</h2>
        <p className="text-xs text-soft mb-4">
          Adjusts machine count (either direction) and extends validity — for changing the plan tier itself, use "Upgrade plan" above.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">
              Machine quota (current: {lic.machine_quota}{currentPlanDef && currentPlanDef.max_machines > 0 ? `, max ${currentPlanDef.max_machines}` : ""})
            </label>
            <input className="input" type="number" min={1} placeholder={String(lic.machine_quota)}
              value={edit.machine_quota} onChange={(e) => setEdit({ ...edit, machine_quota: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Plan</label>
            <p className="input flex items-center capitalize text-soft">{lic.plan} (fixed — use Upgrade plan)</p>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Extend (days)</label>
            <input className="input" type="number" placeholder="e.g. 30"
              value={edit.extend_days} onChange={(e) => setEdit({ ...edit, extend_days: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">
              Deployment URL — locked to: {lic.deployment_url || "none yet"}
            </label>
            <input className="input" placeholder="set to move this license to a new deployment"
              value={edit.deployment_url} onChange={(e) => setEdit({ ...edit, deployment_url: e.target.value })} />
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

      {/* license status */}
      <div className="card p-6 border-bad/30">
        <h2 className="font-semibold mb-1">License status</h2>
        {lic.status === "revoked" ? (
          <p className="text-sm text-soft">This license is revoked — permanent. Issue a new license instead.</p>
        ) : (
          <>
            <p className="text-xs text-soft mb-4">
              Suspend pauses access (deployment calls start failing immediately, reversible). Revoke is permanent.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Action *</label>
                <select className="input" value={statusAction.status}
                  onChange={(e) => setStatusAction({ ...statusAction, status: e.target.value })}>
                  <option value="">choose…</option>
                  {lic.status === "suspended" ? (
                    <option value="confirmed">Reactivate (confirmed)</option>
                  ) : (
                    <option value="suspended">Suspend</option>
                  )}
                  <option value="revoked">Revoke (permanent)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Reason (optional)</label>
                <input className="input" value={statusAction.reason}
                  onChange={(e) => setStatusAction({ ...statusAction, reason: e.target.value })} placeholder="goes to change history" />
              </div>
            </div>
            <button className="btn-danger" disabled={!statusAction.status} onClick={() => setDialog("status")}>
              Apply
            </button>
          </>
        )}
      </div>

      {/* record payment */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Record payment</h2>
        <div className="grid sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Amount (₹) *</label>
            <input className="input" type="number" min={1} placeholder="e.g. 5000"
              value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Method</label>
            <input className="input" placeholder="bank transfer"
              value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Reference / UTR</label>
            <input className="input" placeholder="optional"
              value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Covers period</label>
            <input className="input" placeholder="e.g. Jul 2026"
              value={pay.covers_period} onChange={(e) => setPay({ ...pay, covers_period: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary" onClick={() => setDialog("payment")} disabled={!(Number(pay.amount) > 0)}>
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
        description={`⚠ This affects the live deployment. The old key keeps working for a short grace period, then stops entirely — update LICENSE_API_KEY on ${cust.company_name}'s deployment before it lapses, or their backend will start failing every license check. New key for ${lic.public_id} is emailed and shown only once here.`}
        confirmLabel="Rotate key"
        onConfirm={() => rotateKey()}
        onClose={() => setDialog(null)}
      />

      {/* upgrade plan */}
      <ConfirmDialog
        open={dialog === "upgrade"}
        danger
        busy={dialogBusy}
        title={upgradeIsDemotion ? "Demote this license?" : "Upgrade this license?"}
        description={`⚠ This affects the live deployment — it also rotates the API key. ${cust.company_name} (${lic.public_id}): ${lic.plan} → ${upgrade.plan}, quota ${upgrade.machine_quota}. The old key keeps working for a short grace period, then stops — the new one is emailed and must be set on the deployment before then. Login is unchanged.`}
        confirmLabel={upgradeIsDemotion ? "Demote license" : "Upgrade license"}
        onConfirm={() => upgradeLicense()}
        onClose={() => setDialog(null)}
      />

      {/* license status */}
      <ConfirmDialog
        open={dialog === "status"}
        danger
        busy={dialogBusy}
        title={statusAction.status === "revoked" ? "Revoke this license?" : statusAction.status === "confirmed" ? "Reactivate this license?" : "Suspend this license?"}
        description={
          statusAction.status === "revoked"
            ? `${cust.company_name} (${lic.public_id}) will be permanently revoked. Every deployment call fails immediately and this cannot be undone — issuing access again requires a new license.`
            : `${cust.company_name} (${lic.public_id}): ${lic.status} → ${statusAction.status}. Deployment calls will ${statusAction.status === "confirmed" ? "resume" : "start failing"} immediately.`
        }
        confirmLabel="Apply"
        onConfirm={() => applyStatus()}
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
