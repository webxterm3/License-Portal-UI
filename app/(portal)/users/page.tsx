"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, KeyRound, ShieldCheck } from "lucide-react";
import { api, getRole } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";

type PortalUser = {
  id: string;
  email: string;
  role: string;
  created_by?: string;
  created_at: string;
};

type Dialog =
  | { kind: "delete"; user: PortalUser }
  | { kind: "role"; user: PortalUser }
  | { kind: "password"; user: PortalUser }
  | null;

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [form, setForm] = useState({ email: "", password: "", role: "admin" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  useEffect(() => {
    // team admins have no access here — backend also enforces this
    if (getRole() !== "superadmin") router.replace("/dashboard");
  }, [router]);

  const load = useCallback(async () => {
    try {
      const r = await api<{ users: PortalUser[] }>("/api/admin/users");
      setUsers(r.users || []);
    } catch (e: any) {
      setMsg(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api("/api/admin/users", { method: "POST", body: form });
      setForm({ email: "", password: "", role: "admin" });
      setMsg("User created ✔");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDialogConfirm(value: string) {
    if (!dialog) return;
    setDialogBusy(true);
    setMsg("");
    try {
      if (dialog.kind === "delete") {
        await api(`/api/admin/users/${dialog.user.id}`, { method: "DELETE" });
        setMsg(`${dialog.user.email} deleted ✔`);
      } else if (dialog.kind === "role") {
        const next = dialog.user.role === "superadmin" ? "admin" : "superadmin";
        await api(`/api/admin/users/${dialog.user.id}`, { method: "PATCH", body: { role: next } });
        setMsg(`${dialog.user.email} is now ${next} ✔`);
      } else if (dialog.kind === "password") {
        await api(`/api/admin/users/${dialog.user.id}`, { method: "PATCH", body: { password: value } });
        setMsg(`Password reset for ${dialog.user.email} ✔`);
      }
      setDialog(null);
      load();
    } catch (e: any) {
      setMsg(e.message);
      setDialog(null);
    } finally {
      setDialogBusy(false);
    }
  }

  const nextRole = dialog?.kind === "role" ? (dialog.user.role === "superadmin" ? "admin" : "superadmin") : "";

  return (
    <div>
      <div className="page-header mb-8">
        <h1 className="page-title">Team users</h1>
        <p className="page-description">
          Superadmins see everything; admins can work with licenses but not SMTP settings, audit log or user management.
        </p>
      </div>

      {msg && <p className={`text-sm mb-4 ${msg.includes("✔") ? "text-success" : "text-destructive"}`}>{msg}</p>}

      {/* create user */}
      <form onSubmit={createUser} className="card p-6 mb-6">
        <h2 className="font-semibold mb-4">Add team user</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <input className="input" type="email" required placeholder="teammate@webxterm.me"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" required minLength={8} placeholder="password (min 8 chars)"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">admin (team member)</option>
            <option value="superadmin">superadmin (full access)</option>
          </select>
        </div>
        <button className="btn-primary" disabled={busy}>
          <UserPlus className="h-4 w-4" /> Create user
        </button>
      </form>

      {/* listing */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th">Created by</th>
                <th className="th">Created</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td className="td text-muted-foreground" colSpan={5}>Loading…</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td className="td font-medium">{u.email}</td>
                  <td className="td">
                    <span className={`pill ${u.role === "superadmin" ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="td text-muted-foreground text-xs">{u.created_by || "bootstrap"}</td>
                  <td className="td text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="td">
                    <div className="flex gap-2">
                      <button className="btn-ghost !px-2.5 !py-1.5" title="Toggle role"
                        onClick={() => setDialog({ kind: "role", user: u })}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </button>
                      <button className="btn-ghost !px-2.5 !py-1.5" title="Reset password"
                        onClick={() => setDialog({ kind: "password", user: u })}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button className="btn-ghost !px-2.5 !py-1.5 hover:!text-destructive hover:!border-destructive/40"
                        title="Delete" onClick={() => setDialog({ kind: "delete", user: u })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* delete */}
      <ConfirmDialog
        open={dialog?.kind === "delete"}
        danger
        busy={dialogBusy}
        title="Delete user?"
        description={dialog?.kind === "delete" ? `${dialog.user.email} will lose access to the portal immediately. This action cannot be undone.` : ""}
        confirmLabel="Delete user"
        onConfirm={onDialogConfirm}
        onClose={() => setDialog(null)}
      />

      {/* role change */}
      <ConfirmDialog
        open={dialog?.kind === "role"}
        busy={dialogBusy}
        title={`Change role to ${nextRole}?`}
        description={
          dialog?.kind === "role"
            ? nextRole === "superadmin"
              ? `${dialog.user.email} will get full access — including SMTP settings, audit log and user management.`
              : `${dialog.user.email} will become a team admin — SMTP settings, audit log and user management will be hidden.`
            : ""
        }
        confirmLabel="Change role"
        onConfirm={onDialogConfirm}
        onClose={() => setDialog(null)}
      />

      {/* password reset */}
      <ConfirmDialog
        open={dialog?.kind === "password"}
        busy={dialogBusy}
        title="Reset password"
        description={dialog?.kind === "password" ? `Set a new password for ${dialog.user.email}. They should change it after signing in.` : ""}
        confirmLabel="Reset password"
        input={{ label: "New password", placeholder: "min 8 characters", type: "password", required: true, minLength: 8 }}
        onConfirm={onDialogConfirm}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
