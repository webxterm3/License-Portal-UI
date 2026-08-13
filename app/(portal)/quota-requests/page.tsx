"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { api, fmtDate } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";

type Req = {
  id: string;
  license_id: string;
  requested_delta: number;
  reason?: string;
  status: string;
  requested_at: string;
  decided_at?: string;
  decided_by?: string;
  note?: string;
  company_name: string;
  license_public_id: string;
  current_quota: number;
};

export default function QuotaRequestsPage() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<{ req: Req; approve: boolean } | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ requests: Req[] }>(`/api/admin/quota-requests${filter ? `?status=${filter}` : ""}`);
      setReqs(r.requests || []);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function onDecideConfirm(note: string) {
    if (!dialog) return;
    setDialogBusy(true);
    setError("");
    try {
      await api(`/api/admin/quota-requests/${dialog.req.id}/decide`, {
        method: "POST",
        body: { approve: dialog.approve, note },
      });
      setDialog(null);
      load();
    } catch (e: any) {
      setError(e.message);
      setDialog(null);
    } finally {
      setDialogBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Quota requests</h1>
          <p className="text-sm text-soft">Approve → quota updates + customer emailed. Deployment picks it up on next refresh.</p>
        </div>
        <select className="input w-40" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {error && <p className="text-sm text-bad mb-4">{error}</p>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                <th className="th">Company</th>
                <th className="th">License</th>
                <th className="th">Current → requested</th>
                <th className="th">Reason</th>
                <th className="th">Requested</th>
                <th className="th">Status / actions</th>
              </tr>
            </thead>
            <tbody>
              {reqs.length === 0 ? (
                <tr><td className="td text-soft" colSpan={6}>No {filter || ""} requests.</td></tr>
              ) : reqs.map((r) => (
                <tr key={r.id}>
                  <td className="td font-medium">{r.company_name}</td>
                  <td className="td">
                    <Link href={`/licenses/${r.license_id}`} className="font-mono text-xs text-bp hover:underline">
                      {r.license_public_id}
                    </Link>
                  </td>
                  <td className="td font-mono">
                    {r.current_quota} → {r.current_quota + r.requested_delta}
                    <span className="text-good text-xs ml-1">(+{r.requested_delta})</span>
                  </td>
                  <td className="td text-soft text-xs max-w-56 truncate">{r.reason || "—"}</td>
                  <td className="td text-soft">{fmtDate(r.requested_at)}</td>
                  <td className="td">
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <button className="btn-primary !px-3 !py-1.5" onClick={() => setDialog({ req: r, approve: true })}>
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button className="btn-ghost !px-3 !py-1.5 hover:!text-destructive hover:!border-destructive/40"
                          onClick={() => setDialog({ req: r, approve: false })}>
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`pill ${r.status === "approved" ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>
                        {r.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!dialog}
        danger={dialog ? !dialog.approve : false}
        busy={dialogBusy}
        title={dialog?.approve ? "Approve quota request?" : "Reject quota request?"}
        description={
          dialog
            ? dialog.approve
              ? `${dialog.req.company_name} will go from ${dialog.req.current_quota} to ${dialog.req.current_quota + dialog.req.requested_delta} machines. The customer is emailed and their deployment picks up the new quota on its next license refresh.`
              : `${dialog.req.company_name}'s request for +${dialog.req.requested_delta} machines will be rejected. The customer is notified by email.`
            : ""
        }
        confirmLabel={dialog?.approve ? "Approve & update quota" : "Reject request"}
        input={{ label: "Note to customer (optional)", placeholder: dialog?.approve ? "e.g. billed on next invoice" : "e.g. please upgrade your plan first" }}
        onConfirm={onDecideConfirm}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
