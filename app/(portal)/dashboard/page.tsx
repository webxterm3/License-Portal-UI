"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Clock, BadgeCheck, AlertTriangle, Server, Inbox, Banknote, Ban } from "lucide-react";
import { api } from "@/lib/api";

type Stats = {
  customers: number;
  on_trial: number;
  paid: number;
  suspended: number;
  expiring_7d: number;
  active_machines: number;
  pending_quota_requests: number;
  unpaid_licenses: number;
};

const CARDS: { key: keyof Stats; label: string; icon: any; tone: string }[] = [
  { key: "customers", label: "Customers", icon: Users, tone: "text-primary" },
  { key: "on_trial", label: "On trial", icon: Clock, tone: "text-warning" },
  { key: "paid", label: "Paid", icon: BadgeCheck, tone: "text-success" },
  { key: "expiring_7d", label: "Expiring ≤7d", icon: AlertTriangle, tone: "text-destructive" },
  { key: "active_machines", label: "Active machines", icon: Server, tone: "text-primary" },
  { key: "pending_quota_requests", label: "Pending quota requests", icon: Inbox, tone: "text-warning" },
  { key: "unpaid_licenses", label: "Unpaid (confirmed)", icon: Banknote, tone: "text-destructive" },
  { key: "suspended", label: "Suspended / expired", icon: Ban, tone: "text-muted-foreground" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Stats>("/api/admin/dashboard").then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="page-header mb-8">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Licensing control plane at a glance.</p>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {CARDS.map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className="stat-card !p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">{label}</p>
                <p className="text-3xl font-bold mt-2 tracking-tight">{stats ? stats[key] : "—"}</p>
              </div>
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 ${tone}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold mb-1">Quick actions</h2>
          <p className="text-sm text-muted-foreground">Onboard a new customer or review licenses.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/licenses/onboard" className="btn-primary">Onboard customer</Link>
          <Link href="/licenses" className="btn-ghost">Customer listing</Link>
        </div>
      </div>
    </div>
  );
}
