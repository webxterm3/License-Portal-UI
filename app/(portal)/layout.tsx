"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileBadge, UserPlus, Inbox, Mail, ScrollText, LogOut, Terminal, Sun, Moon, Users,
} from "lucide-react";
import { clearSession, getRole, getToken } from "@/lib/api";

// superadminOnly items are hidden for team (admin-role) users;
// the backend enforces the same rule on its routes.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/licenses", label: "Licenses", icon: FileBadge },
  { href: "/licenses/onboard", label: "Onboard customer", icon: UserPlus },
  { href: "/quota-requests", label: "Quota requests", icon: Inbox },
  { href: "/users", label: "Team users", icon: Users, superadminOnly: true },
  { href: "/settings", label: "SMTP settings", icon: Mail, superadminOnly: true },
  { href: "/audit", label: "Audit log", icon: ScrollText, superadminOnly: true },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/licenses": "Licenses",
  "/licenses/onboard": "Onboard customer",
  "/quota-requests": "Quota requests",
  "/users": "Team users",
  "/settings": "SMTP settings",
  "/audit": "Audit log",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [dark, setDark] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setEmail(localStorage.getItem("lp_email") || "");
    setRole(getRole());
    setDark(document.documentElement.classList.contains("dark"));
  }, [router]);

  const visibleNav = NAV.filter((item) => !item.superadminOnly || role === "superadmin");

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("lp_theme", next ? "dark" : "light");
  }

  const isActive = (href: string) =>
    href === "/licenses"
      ? pathname === "/licenses" || (pathname.startsWith("/licenses/") && !pathname.startsWith("/licenses/onboard"))
      : pathname === href || pathname.startsWith(href + "/");

  const title =
    TITLES[pathname] ||
    (pathname.startsWith("/licenses/") ? "License detail" : "Portal");

  return (
    <div className="min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">
                Web<span className="text-primary">Xterm</span>
              </span>
              <p className="text-[10px] text-muted-foreground font-mono leading-none">licensing portal</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {visibleNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item group ${active ? "active" : ""}`}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                  }`}
                />
                <span className="animate-fade-in">{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />}
              </Link>
            );
          })}
        </nav>

        {/* User / sign out */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              {(email || "SA").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{email || "—"}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{role || "admin"}</p>
            </div>
            <button
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
              title="Sign out"
              className="p-2 rounded-lg text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground font-mono">licence.webxterm.me</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="font-medium">{title}</span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Toggle theme"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="p-6 lg:p-8 animate-fade-in">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
