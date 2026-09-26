"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, Pencil, Eye, EyeOff, Lock } from "lucide-react";
import { api, getRole } from "@/lib/api";

type Provider = { id: string; label: string; host: string; port: number };

// Zoho hosts mailboxes per-region — the wrong one causes a 535 auth failure
// even with the right password, because the account doesn't exist there.
const PROVIDERS: Provider[] = [
  { id: "gmail", label: "Google (Gmail)", host: "smtp.gmail.com", port: 587 },
  { id: "outlook", label: "Outlook / Office 365", host: "smtp.office365.com", port: 587 },
  { id: "zoho-in", label: "Zoho Mail (India)", host: "smtp.zoho.in", port: 587 },
  { id: "zoho-com", label: "Zoho Mail (Global / US)", host: "smtp.zoho.com", port: 587 },
  { id: "zoho-eu", label: "Zoho Mail (EU)", host: "smtp.zoho.eu", port: 587 },
  { id: "yahoo", label: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 587 },
  { id: "custom", label: "Custom SMTP", host: "", port: 587 },
];

const emptyForm = { host: "", port: 587, username: "", password: "", from: "" };

export default function SMTPSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [provider, setProvider] = useState("custom");
  const [configured, setConfigured] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getRole() !== "superadmin") router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    api<{ smtp: any }>("/api/admin/smtp")
      .then((r) => {
        const smtp = { ...emptyForm, ...r.smtp, port: r.smtp.port || 587 };
        setForm(smtp);
        const isConfigured = !!smtp.host;
        setConfigured(isConfigured);
        // day zero: nothing set up yet — go straight to the entry form.
        setEditing(!isConfigured);
      })
      .catch(() => setEditing(true));
  }, []);

  function selectProvider(id: string) {
    setProvider(id);
    const p = PROVIDERS.find((x) => x.id === id);
    if (p && p.id !== "custom") setForm({ ...form, host: p.host, port: p.port });
  }

  const smtpValid = !!(form.host.trim() && form.port && form.username.trim() && form.password.trim() && form.from.trim());

  async function save() {
    if (!smtpValid) {
      setMsg("Host, port, username, password and From address are all required");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await api("/api/admin/smtp", { method: "PUT", body: { ...form, port: Number(form.port) } });
      setMsg("SMTP settings saved ✔");
      setConfigured(true);
      setEditing(false);
      setShowPassword(false);
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

      {!editing ? (
        // Locked view — only the From address (what recipients actually see) is
        // shown in the clear; host/port/username/password stay redacted.
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-soft">
            <Lock className="h-3.5 w-3.5" /> Mail account configured
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Host</label>
              <p className="input flex items-center tracking-widest text-soft">••••••••••••</p>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Port</label>
              <p className="input flex items-center tracking-widest text-soft">•••</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Username</label>
            <p className="input flex items-center tracking-widest text-soft">••••••••••••</p>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Password</label>
            <p className="input flex items-center tracking-widest text-soft">••••••••</p>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">From address</label>
            <p className="input flex items-center">{form.from || "—"}</p>
          </div>
          <button className="btn-ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit mail info
          </button>
        </div>
      ) : (
        <div className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Mail provider</label>
            <select className="input" value={provider} onChange={(e) => selectProvider(e.target.value)}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Host *</label>
              <input className="input" value={form.host} placeholder="smtp.example.com"
                onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Port *</label>
              <input className="input" type="number" value={form.port}
                onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Username *</label>
            <input className="input" value={form.username} placeholder="licensing@webxterm.me"
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">Password *</label>
            <div className="relative">
              <input className="input pr-10" type={showPassword ? "text" : "password"} value={form.password}
                placeholder="app password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-soft hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-soft mb-1.5">From address *</label>
            <input className="input" value={form.from} placeholder="licensing@webxterm.me"
              onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={save} disabled={busy || !smtpValid}>
              <Mail className="h-4 w-4" /> Save settings
            </button>
            {configured && (
              <button className="btn-ghost" onClick={() => { setEditing(false); setShowPassword(false); }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

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
