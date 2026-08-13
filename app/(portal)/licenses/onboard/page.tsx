"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Server } from "lucide-react";
import { api, Plan } from "@/lib/api";

type OnboardResult = {
  license_id: string;
  public_id: string;
  api_key: string;
  password: string;
  status: string;
  quota: number;
};

export default function OnboardPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({
    company_name: "",
    email: "",
    phone: "",
    deployment_url: "",
    plan: "community",
    machine_quota: 0,
    custom_rate: 0,
    updates_granted: true,
    update_channel: "stable",
  });
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    api<{ plans: Plan[] }>("/api/admin/plans").then((r) => setPlans(r.plans)).catch(() => {});
  }, []);

  const selectedPlan = plans.find((p) => p.id === form.plan);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<OnboardResult>("/api/admin/customers", {
        method: "POST",
        body: { ...form, machine_quota: Number(form.machine_quota) || 0, custom_rate: Number(form.custom_rate) || 0 },
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  if (result) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold mb-1">Customer onboarded ✔</h1>
        <p className="text-sm text-soft mb-6">
          Credentials emailed via SMTP. They are shown here <b>once</b> — copy them now.
        </p>
        <div className="card p-6 space-y-4">
          {[
            { label: "License ID", value: result.public_id, key: "pid" },
            { label: "Deployment API key (LICENSE_API_KEY)", value: result.api_key, key: "key" },
            { label: "Customer superadmin password", value: result.password, key: "pw" },
          ].map(({ label, value, key }) => (
            <div key={key}>
              <p className="text-[11px] font-mono uppercase tracking-wider text-soft mb-1">{label}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-xs break-all">{value}</code>
                <button className="btn-ghost !px-3" onClick={() => copy(value, key)}>
                  {copied === key ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs text-soft">
            Status: <b className="uppercase">{result.status}</b> · Machine quota: <b>{result.quota}</b>
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="btn-primary" onClick={() => router.push(`/licenses/${result.license_id}`)}>
            View license
          </button>
          <button className="btn-ghost" onClick={() => { setResult(null); }}>
            Onboard another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Onboard customer</h1>
      <p className="text-sm text-soft mb-6">
        Creates the customer + license, generates the deployment API key and superadmin credentials, and emails them.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="card p-6 grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Company name *</label>
            <input className="input" required value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Email *</label>
            <input className="input" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@acme.com" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Phone</label>
            <input className="input" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Deployment URL</label>
            <input className="input" value={form.deployment_url}
              onChange={(e) => setForm({ ...form, deployment_url: e.target.value })} placeholder="https://console.acme.com" />
          </div>
        </div>

        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-soft mb-3">Plan (plan-based billing — no pay-as-you-go)</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {plans.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setForm({ ...form, plan: p.id })}
                className={`card p-4 text-left transition-colors ${
                  form.plan === p.id ? "border-bp bg-bpdeep/10" : "hover:border-bp/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{p.name}</span>
                  {p.trial && <span className="pill bg-warn/15 text-warn">trial</span>}
                </div>
                <p className="text-xs text-soft">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-6 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">
              Machine quota {selectedPlan && selectedPlan.max_machines > 0 ? `(max ${selectedPlan.max_machines})` : ""}
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-soft" />
              <input className="input pl-9" type="number" min={0} value={form.machine_quota || ""}
                onChange={(e) => setForm({ ...form, machine_quota: Number(e.target.value) })}
                placeholder={selectedPlan?.trial ? "default 10" : "plan max"} />
            </div>
          </div>
          {form.plan === "enterprise" && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">
                Custom rate (₹/machine/mo)
              </label>
              <input className="input" type="number" min={0} value={form.custom_rate || ""}
                onChange={(e) => setForm({ ...form, custom_rate: Number(e.target.value) })} placeholder="negotiated" />
            </div>
          )}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Update channel</label>
            <input className="input" value={form.update_channel}
              onChange={(e) => setForm({ ...form, update_channel: e.target.value })} placeholder="stable" />
          </div>
          <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.updates_granted}
              onChange={(e) => setForm({ ...form, updates_granted: e.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--primary))]" />
            Product updates granted
          </label>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}
        <button className="btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create customer & issue license"}
        </button>
      </form>
    </div>
  );
}
