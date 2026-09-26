"use client";

import { useEffect } from "react";
import { clearSession } from "@/lib/api";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
const ACTIVITY_KEY = "lp_last_activity";
const CHECK_INTERVAL_MS = 15_000;

/** Logs out after `timeoutMs` of inactivity. Shared via localStorage, so activity in one tab keeps all tabs alive. */
export function useIdleLogout(timeoutMs: number) {
  useEffect(() => {
    let lastWrite = 0;

    function markActivity() {
      const now = Date.now();
      if (now - lastWrite < 1000) return; // throttle noisy events

      lastWrite = now;
      localStorage.setItem(ACTIVITY_KEY, String(now));
    }

    markActivity();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActivity, { passive: true }));

    const interval = setInterval(() => {
      const last = Number(localStorage.getItem(ACTIVITY_KEY)) || Date.now();
      if (Date.now() - last >= timeoutMs) {
        clearSession();
        window.location.href = "/login?reason=idle";
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActivity));
      clearInterval(interval);
    };
  }, [timeoutMs]);
}
