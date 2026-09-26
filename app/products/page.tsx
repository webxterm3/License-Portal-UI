"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Laptop2, LogOut, Terminal, ArrowRight } from "lucide-react";
import { clearSession, getToken, setProduct, PRODUCTS, type ProductId } from "@/lib/api";

/** Product chooser — sets which product's data the portal operates on (see lib/api.ts). */
export default function ProductsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setEmail(localStorage.getItem("lp_email") || "");
  }, [router]);

  function enter(id: ProductId) {
    setProduct(id);
    router.replace("/dashboard");
  }

  const cards: { id: ProductId; icon: React.ElementType }[] = [
    { id: "pam", icon: ShieldCheck },
    { id: "epm", icon: Laptop2 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 lg:px-10 h-16 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Terminal className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Web<span className="text-primary">Xterm</span>
            <span className="ml-2 text-muted-foreground font-normal text-sm">Licensing Platform</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline">{email}</span>
          <button
            onClick={() => {
              clearSession();
              router.replace("/login");
            }}
            className="btn-ghost h-9 px-3 text-sm flex items-center gap-2"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12 max-w-lg"
        >
          <h1 className="text-3xl font-bold tracking-tight mb-3">Which product are you licensing?</h1>
          <p className="text-muted-foreground">
            Each product has its own customers, licenses, and machine quotas. Pick one to continue —
            you can switch products at any time from the sidebar.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 w-full max-w-3xl">
          {cards.map(({ id, icon: Icon }, i) => {
            const def = PRODUCTS[id];
            return (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                whileHover={{ y: -3 }}
                onClick={() => enter(id)}
                className="card text-left p-7 relative overflow-hidden transition-all group hover:border-primary/50 hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-5 bg-primary/10 text-primary">
                  <Icon className="w-6 h-6" />
                </div>

                <h2 className="text-lg font-semibold mb-1">{def.label}</h2>
                <p className="text-sm font-mono text-primary/80 mb-3">{def.fullName}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{def.description}</p>

                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Enter portal
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
