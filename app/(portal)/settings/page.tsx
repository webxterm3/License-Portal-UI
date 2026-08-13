"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send } from "lucide-react";
import { api, getRole } from "@/lib/api";

export default function SMTPSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({ host: "", port: 587, username: "", password: "", from: "" });
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getRole() !== "superadmin") router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    api<{ smtp: any }>("/api/admin/smtp")
      .then((r) => setForm({ ...r.smtp, port: r.smtp.port || 587 }))
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api("/api/admin/smtp", { method: "PUT", body: { ...form, port: Number(form.port) } });
      setMsg("SMTP settings saved ✔");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      await api("/api/admin/smtp/test", { method: "POST", body: { to: testTo } });
      setMsg(`Test mail sent to ${testTo} ✔`);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">SMTP settings</h1>
      <p className="text-sm text-soft mb-6">
        Used for onboarding credentials, trial-expiry reminders and quota-approval notifications.
        Saved settings override the SMTP_* env vars.
      </p>

      <div className="card p-6 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Host</label>
            <input className="input" value={form.host} placeholder="smtp.zoho.in"
              onChange={(e) => setForm({ ...form, host: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Port</label>
            <input className="input" type="number" value={form.port}
              onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Username</label>
          <input className="input" value={form.username} placeholder="licensing@webxterm.me"
            onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Password</label>
          <input className="input" type="password" value={form.password} placeholder="app password"
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">From address</label>
          <input className="input" value={form.from} placeholder="licensing@webxterm.me"
            onChange={(e) => setForm({ ...form, from: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={save} disabled={busy}>
          <Mail className="h-4 w-4" /> Save settings
        </button>
      </div>

      <div className="card p-6 mt-4">
        <h2 className="font-semibold mb-3">Send test email</h2>
        <div className="flex gap-3">
          <input className="input flex-1" type="email" placeholder="you@example.com"
            value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <button className="btn-ghost" onClick={test} disabled={busy || !testTo}>
            <Send className="h-4 w-4" /> Test
          </button>
        </div>
      </div>

      {msg && <p className={`text-sm mt-4 ${msg.includes("✔") ? "text-good" : "text-bad"}`}>{msg}</p>}
    </div>
  );
}
