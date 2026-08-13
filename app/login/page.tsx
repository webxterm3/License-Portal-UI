"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Terminal, Loader2, Mail, Lock, ShieldCheck, KeySquare, Server } from "lucide-react";
import { motion } from "framer-motion";
import { api, setSession } from "@/lib/api";

/* ─── Floating orb ─────────────────────────────────────────────── */
function FloatingOrb({ size, x, y, delay }: { size: number; x: string; y: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size, left: x, top: y,
        background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
      }}
      animate={{ y: [0, -20, 0], opacity: [0.4, 0.9, 0.4] }}
      transition={{ duration: 6 + delay * 1.5, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

/* ─── Animated typing terminal ─────────────────────────────────── */
const termLines = [
  { text: "$ webxterm license activate --key wxl_****", color: "green", delay: 400 },
  { text: "✓ Signed entitlement verified (Ed25519)", color: "primary", delay: 300 },
  { text: "$ webxterm license status", color: "green", delay: 500 },
  { text: "plan: business      quota: 500 machines", color: "muted", delay: 150 },
  { text: "status: confirmed   expires: 2027-07-06", color: "muted", delay: 100 },
  { text: "$ webxterm machines add prod-server-42", color: "green", delay: 600 },
  { text: "✓ 42 / 500 — within licensed quota", color: "primary", delay: 350 },
];

function AnimatedTerminal() {
  const [displayed, setDisplayed] = useState<{ text: string; color: string }[]>([]);
  const [line, setLine] = useState(0);
  const [ch, setCh] = useState(0);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    if (line >= termLines.length) return;
    const l = termLines[line];
    const delay = ch === 0 ? (l.delay ?? 0) : 36;
    const timer = setTimeout(() => {
      if (ch < l.text.length) {
        setDisplayed((prev) => {
          const next = [...prev];
          if (next.length <= line) next.push({ text: "", color: l.color });
          next[line] = { text: l.text.slice(0, ch + 1), color: l.color };
          return next;
        });
        setCh((c) => c + 1);
      } else {
        setLine((n) => n + 1);
        setCh(0);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [line, ch]);

  useEffect(() => {
    const id = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(id);
  }, []);

  const colorClass = (c: string) =>
    c === "green" ? "text-[hsl(var(--terminal-text))]"
    : c === "primary" ? "text-primary"
    : "text-muted-foreground/70";

  return (
    <div className="terminal-bg rounded-xl border border-border/20 p-5 font-mono text-sm mt-10">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-destructive" />
        <div className="w-3 h-3 rounded-full bg-warning" />
        <div className="w-3 h-3 rounded-full bg-success" />
        <span className="ml-2 text-xs text-muted-foreground/60 font-mono">licence.webxterm.me — control plane</span>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="ml-auto flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="text-[10px] font-mono text-success/80">LIVE</span>
        </motion.div>
      </div>

      <div className="space-y-1">
        {displayed.map((l, i) => (
          <div key={i} className={colorClass(l.color)}>{l.text}</div>
        ))}
        {line < termLines.length && (
          <span className={`inline-block w-2 h-[1em] bg-primary align-middle ml-0.5 ${cursor ? "opacity-100" : "opacity-0"}`} />
        )}
        {line >= termLines.length && (
          <div className="text-[hsl(var(--terminal-text))]">
            superadmin@licence:~${" "}
            <span className={`inline-block w-2 h-[1em] bg-primary align-middle ml-0.5 ${cursor ? "opacity-100" : "opacity-0"}`} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<{ token: string; email: string; role: string }>("/api/admin/login", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), password },
      });
      setSession(res.token, res.email, res.role);
      window.location.replace("/dashboard");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel — Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* Radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--primary) / 0.15), transparent)" }}
        />

        <FloatingOrb size={320} x="60%" y="-5%" delay={0} />
        <FloatingOrb size={200} x="-8%" y="55%" delay={1.4} />
        <FloatingOrb size={160} x="70%" y="65%" delay={2.2} />

        {/* Blinking scatter dots */}
        {[
          { x: "12%", y: "18%" }, { x: "78%", y: "12%" }, { x: "88%", y: "45%" },
          { x: "8%", y: "78%" }, { x: "55%", y: "88%" }, { x: "35%", y: "5%" },
        ].map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/50 pointer-events-none"
            style={{ left: pos.x, top: pos.y }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.6, 1] }}
            transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.6 }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute inset-0 rounded-xl bg-primary/30 blur-sm pointer-events-none"
              />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                <Terminal className="w-6 h-6" />
              </div>
            </div>
            <span className="text-4xl font-extrabold tracking-tight">
              Web<span className="gradient-text">Xterm</span>
            </span>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary w-fit mb-6"
          >
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-primary"
            />
            Licensing &amp; Entitlement Control Plane
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5">
              Licensing Control<br />
              <span className="gradient-text">Made Simple</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-md leading-relaxed">
              Issue licenses, enforce machine quotas, and track billing for every
              WebXTerm deployment — from one portal.
            </p>
          </motion.div>

          {/* Animated terminal */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <AnimatedTerminal />
          </motion.div>

          {/* Trust chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-wrap gap-2.5 mt-8"
          >
            {[
              { icon: KeySquare, text: "Ed25519 signed licenses" },
              { icon: Server, text: "Hard machine-quota enforcement" },
              { icon: ShieldCheck, text: "Full audit trail" },
            ].map((chip, i) => (
              <motion.div
                key={chip.text}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.9 + i * 0.1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 border border-border/60 text-xs text-muted-foreground backdrop-blur-sm"
              >
                <chip.icon className="h-3 w-3 text-primary" />
                {chip.text}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none opacity-40"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="lg:hidden flex items-center justify-center gap-3 mb-8"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <Terminal className="w-5 h-5" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight">
              Web<span className="gradient-text">Xterm</span>
            </span>
          </motion.div>

          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold">Welcome back</h2>
              <p className="text-muted-foreground mt-2 text-sm">Sign in to the licensing portal</p>
            </motion.div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="space-y-2"
            >
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@webxterm.me"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10 h-12"
                  required
                  autoComplete="email"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.27 }}
              className="space-y-2"
            >
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10 h-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.34 }}
            >
              <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}>
                <button type="submit" className="btn-primary w-full h-12 text-base" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </motion.div>
            </motion.div>
          </form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-6 text-center text-xs text-muted-foreground font-mono"
          >
            single-superadmin control plane
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
