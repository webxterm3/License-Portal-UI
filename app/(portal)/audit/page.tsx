"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getRole } from "@/lib/api";

type Entry = { id: string; actor: string; action: string; target: string; metadata?: string; at: string };

export default function AuditPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getRole() !== "superadmin") router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    api<{ entries: Entry[] }>("/api/admin/audit")
      .then((r) => setEntries(r.entries || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Audit log</h1>
      <p className="text-sm text-soft mb-6">Every actor + action across the portal (latest 200).</p>
      {error && <p className="text-sm text-bad mb-4">{error}</p>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr><th className="th">When</th><th className="th">Actor</th><th className="th">Action</th><th className="th">Target</th><th className="th">Metadata</th></tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td className="td text-soft" colSpan={5}>No audit entries yet.</td></tr>
              ) : entries.map((e) => (
                <tr key={e.id}>
                  <td className="td text-soft text-xs font-mono whitespace-nowrap">{new Date(e.at).toLocaleString("en-IN")}</td>
                  <td className="td text-xs font-mono">{e.actor}</td>
                  <td className="td"><span className="pill bg-bp/15 text-bp">{e.action}</span></td>
                  <td className="td text-xs font-mono">{e.target}</td>
                  <td className="td text-soft text-xs max-w-56 truncate">{e.metadata || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
