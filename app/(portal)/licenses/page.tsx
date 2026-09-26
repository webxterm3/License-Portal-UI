"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { api, fmtDate, License, STATUS_COLORS } from "@/lib/api";

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (status) qs.set("status", status);
      if (plan) qs.set("plan", plan);
      const res = await api<{ licenses: License[] }>(`/api/admin/licenses?${qs}`);
      setLicenses(res.licenses || []);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, plan]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Licenses</h1>
          <p className="text-sm text-soft">All customers and their entitlements.</p>
        </div>
        <Link href="/licenses/onboard" className="btn-primary">
          <Plus className="h-4 w-4" /> Onboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-soft" />
          <input
            className="input pl-9"
            placeholder="Search company, email, license id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="trial">Trial</option>
          <option value="confirmed">Confirmed</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
        <select className="input w-44" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">All plans</option>
          <option value="community">Community</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {error && <p className="text-sm text-bad mb-4">{error}</p>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr>
                <th className="th">Company</th>
                <th className="th">License</th>
                <th className="th">Plan</th>
                <th className="th">Machines</th>
                <th className="th">Status</th>
                <th className="th">Paid</th>
                <th className="th">Subscribed</th>
                <th className="th">Expires</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="td text-soft" colSpan={8}>Loading…</td></tr>
              ) : licenses.length === 0 ? (
                <tr><td className="td text-soft" colSpan={8}>No licenses yet — onboard your first customer.</td></tr>
              ) : (
                licenses.map((l) => (
                  <tr key={l.id} className="hover:bg-line/20 transition-colors">
                    <td className="td">
                      <Link href={`/licenses/${l.id}`} className="font-medium text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors">
                        {l.company_name || "—"}
                      </Link>
                      <p className="text-xs text-soft">{l.email}</p>
                    </td>
                    <td className="td font-mono text-xs">{l.public_id}</td>
                    <td className="td capitalize">{l.plan}</td>
                    <td className="td font-mono">
                      {l.machines_used ?? 0} / {l.machine_quota}
                    </td>
                    <td className="td">
                      <span className={`pill ${STATUS_COLORS[l.status] || ""}`}>{l.status}</span>
                    </td>
                    <td className="td">
                      <span className={l.amount_paid ? "text-good" : "text-bad"}>
                        {l.amount_paid ? "yes" : "no"}
                      </span>
                    </td>
                    <td className="td text-soft">{fmtDate(l.created_at)}</td>
                    <td className="td text-soft">{fmtDate(l.trial_expires_at || l.expires_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
