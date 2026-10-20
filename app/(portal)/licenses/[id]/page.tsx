"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Check, RefreshCw, Banknote, ArrowUpCircle, ArrowDownCircle, Download, FileKey } from "lucide-react";
import { api, fmtDate, fmtINR, STATUS_COLORS, Plan, API_BASE, getToken, getProduct } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";

// Tier order for labeling a plan change as an upgrade or a demotion — same
// order as the backend's ProductPlanOrder.
const PLAN_RANK: Record<string, number> = { community: 0, professional: 1, enterprise: 2 };

type Detail = {
  license: any;
  customer: any;
  history: any[];
  payments: any[];
  billing: {
    rate_per_machine: number;
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
  const [latestFile, setLatestFile] = useState("");  // unified: any newly generated file
  const [copied, setCopied] = useState(false);
  const [dialog, setDialog] = useState<null | "save" | "payment" | "upgrade" | "status" | "file">(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  // edit form — quota (either direction) + extend; plan/status live elsewhere
  const [edit, setEdit] = useState({ machine_quota: "", extend_days: "", reason: "" });
  const [updGranted, setUpdGranted] = useState<boolean | null>(null);
  // shared license validity — one field used by confirm, payment, upgrade, reissue
  const [validDays, setValidDays] = useState("365");
  // payment form
  const [pay, setPay] = useState({ amount: "", method: "bank transfer", reference: "", covers_period: "" });
  // upgrade plan
  const [plans, setPlans] = useState<Plan[]>([]);
  const [upgrade, setUpgrade] = useState({ plan: "", machine_quota: "", reason: "" });
  // suspend / reactivate / revoke
  const [statusAction, setStatusAction] = useState({ status: "", reason: "" });
  // notification emails
  const [notifEmails, setNotifEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [notifMsg, setNotifMsg] = useState("");

  useEffect(() => {
    api<{ plans: Plan[] }>("/api/admin/plans").then((r) => setPlans(r.plans)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api<Detail>(`/api/admin/licenses/${id}`);
      setData(d);
      setNotifEmails(d.license.notification_emails || []);
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
    if (updGranted !== null) parts.push(`updates ${updGranted ? "granted" : "revoked"}`);
    return parts.join(" · ");
  }

  const hasEdits = !!(edit.machine_quota || edit.extend_days || updGranted !== null);

  async function saveEdit() {
    setDialogBusy(true);
    setMsg("");
    const body: any = { reason: edit.reason };
    if (edit.machine_quota) body.machine_quota = Number(edit.machine_quota);
    if (edit.extend_days) body.extend_days = Number(edit.extend_days);
    if (updGranted !== null) body.updates_granted = updGranted;
    try {
      const r = await api<{ license_file?: string }>(`/api/admin/licenses/${id}`, { method: "PATCH", body });
      setEdit({ machine_quota: "", extend_days: "", reason: "" });
      setUpdGranted(null);
      if (r.license_file) {
        setLatestFile(r.license_file);
        setMsg("License updated ✔ — new license file shown below, also emailed");
      } else {
        setMsg("License updated ✔");
      }
      load();
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
      const r = await api<{ license_file: string }>(`/api/admin/licenses/${id}/upgrade`, {
        method: "POST",
        body: {
          plan: upgrade.plan,
          machine_quota: Number(upgrade.machine_quota) || 0,
          reason: upgrade.reason,
          valid_days: Number(validDays) || 365,
        },
      });
      setLatestFile(r.license_file);
      setUpgrade({ plan: "", machine_quota: "", reason: "" });
      setMsg("License upgraded ✔ — new license file shown below, also emailed");
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

  async function downloadLicenseFile() {
    setDialogBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/licenses/${id}/license-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          ...(getProduct() ? { "X-Product": getProduct()! } : {}),
        },
        body: JSON.stringify({ valid_days: Number(validDays) || 365 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `request failed (${res.status})`);
      }
      const json = await res.json();
      if (json.license_file) setLatestFile(json.license_file);
      setMsg("License file generated — shown below, also emailed to customer ✔");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDialogBusy(false);
      setDialog(null);
    }
  }

  function downloadLatestFile(publicId: string) {
    if (!latestFile) return;
    const blob = new Blob([latestFile], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${publicId}-license.lic`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function recordPayment() {
    setDialogBusy(true);
    setMsg("");
    try {
      const r = await api<{ payment: any; license_file: string }>(
        `/api/admin/licenses/${id}/payments`,
        { method: "POST", body: { ...pay, amount: Number(pay.amount), valid_days: Number(validDays) || 365 } },
      );
      setPay({ amount: "", method: "bank transfer", reference: "", covers_period: "" });
      if (r.license_file) setLatestFile(r.license_file);
      setMsg("Payment recorded — license file emailed to customer ✔");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDialogBusy(false);
      setDialog(null);
    }
  }

  async function saveNotifEmails(emails: string[]) {
    setNotifMsg("");
    try {
      await api(`/api/admin/licenses/${id}/notification-emails`, { method: "PUT", body: { emails } });
      setNotifEmails(emails);
      setNotifMsg("Saved ✔");
      setTimeout(() => setNotifMsg(""), 2000);
    } catch (e: any) {
      setNotifMsg(e.message);
    }
  }

  function addNotifEmail() {
    const e = newEmail.trim();
    if (!e || notifEmails.includes(e)) { setNewEmail(""); return; }
    const updated = [...notifEmails, e];
    setNewEmail("");
    saveNotifEmails(updated);
  }

  function removeNotifEmail(email: string) {
    saveNotifEmails(notifEmails.filter((e) => e !== email));
  }

  async function confirmTrial() {
    setDialogBusy(true);
    setMsg("");
    try {
      await api(`/api/admin/licenses/${id}/status`, { method: "POST", body: { status: "confirmed", reason: "trial confirmed by admin" } });
      const r = await api<{ license_file: string }>(`/api/admin/licenses/${id}/license-file`, {
        method: "POST",
        body: { valid_days: Number(validDays) || 365 },
      });
      if (r.license_file) setLatestFile(r.license_file);
      setMsg("Trial confirmed — license file emailed to customer ✔");
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
      {latestFile && (
        <div className="card p-4 border-warn/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-warn">New license file — emailed to customer</p>
            <div className="flex items-center gap-1">
              <button className="btn-ghost !px-2.5 text-xs flex items-center gap-1" onClick={() => { navigator.clipboard.writeText(latestFile); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5" />} Copy
              </button>
              <button className="btn-ghost !px-2.5 text-xs flex items-center gap-1" onClick={() => downloadLatestFile(lic.public_id)}>
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
          <code className="block bg-paper border border-line rounded-lg px-3 py-2 text-xs break-all">{latestFile}</code>
        </div>
      )}

      {/* shared license validity — applies to confirm, payment, upgrade, reissue */}
      <div className="card p-4 flex flex-wrap items-center gap-4 border-accent/40">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-soft mb-0.5">License file validity (days)</p>
          <p className="text-xs text-soft">Applied to every new file issued — confirm, payment, upgrade, manual reissue.</p>
        </div>
        <input className="input w-36" type="number" min={1} max={3650}
          value={validDays} onChange={(e) => setValidDays(e.target.value)} placeholder="365" />
      </div>

      {/* entitlement + billing */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-soft mb-2">Machine quota</p>
          <p className="text-3xl font-bold">{lic.machine_quota}</p>
          <p className="text-xs text-soft mt-2">
            Baked into the license file — enforced by the deployment itself, not tracked live here.
          </p>
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
          <p><span className="text-soft">License expires:</span> {fmtDate(lic.trial_expires_at || lic.expires_at)}</p>
          <p><span className="text-soft">Updates:</span> {lic.updates_granted ? `granted (${lic.update_channel || "stable"})` : "not granted"}</p>
          <p><span className="text-soft">Current file valid until:</span> {fmtDate(lic.file_expires_at)}</p>
          <p><span className="text-soft">File last issued:</span> {fmtDate(lic.last_file_issued_at)}</p>
        </div>
      </div>

      {/* upgrade plan */}
      <div className="card p-6 border-bp/40">
        <h2 className="font-semibold mb-1">Upgrade plan</h2>
        <p className="text-xs text-soft mb-4">
          Changes the plan tier. Login stays the same — a new license file is generated and emailed; the
          previous file still verifies until its own expiry, so this only takes effect once it's swapped in.
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
          Either change reissues the license file automatically.
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
        <button className="btn-primary" disabled={!hasEdits} onClick={() => setDialog("save")}>
          <RefreshCw className="h-4 w-4" /> Save changes
        </button>
      </div>

      {/* license status */}
      <div className="card p-6 border-bad/30">
        <h2 className="font-semibold mb-1">License status</h2>
        {lic.status === "revoked" ? (
          <p className="text-sm text-soft">This license is revoked — permanent. Issue a new license instead.</p>
        ) : (
          <>
            <p className="text-xs text-soft mb-4">
              Admin-side bookkeeping only — it does not remotely affect a license file already handed over
              (there's no way to). It gates whether a <i>new</i> file can be issued going forward: suspended
              or revoked licenses can't get one via Upgrade/Update/the license-file card below.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Action *</label>
                <select className="input" value={statusAction.status}
                  onChange={(e) => setStatusAction({ ...statusAction, status: e.target.value })}>
                  <option value="">choose…</option>
                  {(lic.status === "suspended" || lic.status === "trial") ? (
                    <option value="confirmed">{lic.status === "trial" ? "Activate (confirmed)" : "Reactivate (confirmed)"}</option>
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

      {/* (re)issue license file */}
      <div className="card p-6">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <FileKey className="h-4 w-4 text-soft" /> License file
        </h2>
        {lic.status !== "trial" && lic.status !== "confirmed" ? (
          <p className="text-sm text-soft">
            License is {lic.status} — only a trial/confirmed license can get a license file.
          </p>
        ) : (
          <>
            <p className="text-xs text-soft mb-4">
              The only artifact this deployment ever needs — verified locally by signature + a baked-in
              expiry, no further contact with this portal required. One is issued automatically on
              onboarding and on every Upgrade/Update; use this to proactively reissue one ahead of renewal,
              or to redeliver the current one.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Valid for (days)</label>
                <input className="input" type="number" min={1} max={3650} value={validDays}
                  onChange={(e) => setValidDays(e.target.value)} placeholder="365" />
              </div>
            </div>
            <button className="btn-primary" disabled={!validDays || Number(validDays) < 1} onClick={() => setDialog("file")}>
              <Download className="h-4 w-4" /> Generate & send
            </button>
          </>
        )}
      </div>

      {/* confirm / record payment */}
      <div className="card p-6">
        {lic.status === "trial" ? (
          <>
            <h2 className="font-semibold mb-1">Confirm trial</h2>
            <p className="text-sm text-soft mb-4">
              Mark this trial as confirmed (no payment needed). A new license file will be generated and emailed to the customer automatically.
            </p>
            <button className="btn-primary" onClick={() => setDialog("payment")}>
              <Check className="h-4 w-4" /> Confirm &amp; activate
            </button>
          </>
        ) : (
          <>
            <h2 className="font-semibold mb-4">Record payment</h2>
            <div className="grid sm:grid-cols-5 gap-4 mb-4">
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
          </>
        )}
      </div>

      {/* notification emails */}
      <div className="card p-5">
        <h2 className="font-semibold mb-1">Notification emails</h2>
        <p className="text-xs text-soft mb-4">
          All license mails (file, expiry warning, lockdown) go to the primary customer email
          <span className="font-mono text-accent"> {cust.email}</span> plus every address listed here.
          Useful when the primary contact changes or multiple people need to receive license updates.
        </p>
        {notifEmails.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {notifEmails.map((e) => (
              <span key={e} className="flex items-center gap-1.5 bg-paper border border-line rounded-full px-3 py-1 text-xs font-mono">
                {e}
                <button onClick={() => removeNotifEmail(e)} className="text-soft hover:text-bad transition-colors ml-1" title="Remove">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="email"
            placeholder="Add email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNotifEmail(); } }}
          />
          <button className="btn-primary" onClick={addNotifEmail}>Add</button>
        </div>
        {notifMsg && <p className={`text-xs mt-2 ${notifMsg.includes("✔") ? "text-good" : "text-bad"}`}>{notifMsg}</p>}
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
        description={`${cust.company_name} (${lic.public_id}): ${editSummary() || "no changes"}. A quota or expiry change reissues the license file and emails it — redeliver it to take effect.`}
        confirmLabel="Apply changes"
        onConfirm={() => saveEdit()}
        onClose={() => setDialog(null)}
      />

      {/* upgrade plan */}
      <ConfirmDialog
        open={dialog === "upgrade"}
        danger
        busy={dialogBusy}
        title={upgradeIsDemotion ? "Demote this license?" : "Upgrade this license?"}
        description={`${cust.company_name} (${lic.public_id}): ${lic.plan} → ${upgrade.plan}, quota ${upgrade.machine_quota}. A new license file is generated and emailed — the previous file keeps verifying until its own expiry, so redeliver this one to actually take effect. Login is unchanged.`}
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
            ? `${cust.company_name} (${lic.public_id}) will be permanently revoked here — bookkeeping only, it cannot reach a file already delivered. No new file can be issued for it afterward.`
            : `${cust.company_name} (${lic.public_id}): ${lic.status} → ${statusAction.status}. This only gates future license-file issuance — it has no remote effect on a file already delivered.`
        }
        confirmLabel="Apply"
        onConfirm={() => applyStatus()}
        onClose={() => setDialog(null)}
      />

      {/* license file */}
      <ConfirmDialog
        open={dialog === "file"}
        busy={dialogBusy}
        title="Generate license file?"
        description={`Valid for ${validDays} day(s) from now for ${cust.company_name} (${lic.public_id}). Verified entirely locally by the deployment (signature + expiry) — there's no way to revoke or suspend it remotely once delivered.`}
        confirmLabel="Generate & download"
        onConfirm={() => downloadLicenseFile()}
        onClose={() => setDialog(null)}
      />

      {/* confirm trial / record payment */}
      <ConfirmDialog
        open={dialog === "payment"}
        busy={dialogBusy}
        title={lic.status === "trial" ? "Confirm & activate this trial?" : "Record payment?"}
        description={
          lic.status === "trial"
            ? `${cust.company_name} (${lic.public_id}) will be marked confirmed. A license file (365 days) will be generated and emailed to ${cust.email} automatically.`
            : `Record ${pay.amount ? fmtINR(Number(pay.amount)) : ""} (${pay.method || "—"}) for ${cust.company_name}. License file will be generated and emailed to ${cust.email}.`
        }
        confirmLabel={lic.status === "trial" ? "Confirm & activate" : "Record payment"}
        onConfirm={() => lic.status === "trial" ? confirmTrial() : recordPayment()}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
