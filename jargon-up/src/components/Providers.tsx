"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { applyStoredTheme } from "@/lib/theme";

/** Fournisseurs globaux côté client. `reducedMotion="user"` suit le réglage système. */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Décalage horaire → cookie lu par le serveur (objectif du jour, série). Voir lib/tz.ts.
    document.cookie = `tz=${new Date().getTimezoneOffset()}; path=/; max-age=31536000; samesite=lax`;
    applyStoredTheme();
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
