"use client";

import { useEffect } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import { applyStoredTheme } from "@/lib/theme";

const loadMotionFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

/**
 * Fournisseurs globaux côté client.
 * - LazyMotion : le moteur d'animation est téléchargé après l'affichage (`strict` interdit
 *   les composants `motion.*` complets, qui l'embarqueraient dans le premier chargement).
 * - `reducedMotion="user"` suit le réglage système.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Décalage horaire → cookie lu par le serveur (objectif du jour, série). Voir lib/tz.ts.
    document.cookie = `tz=${new Date().getTimezoneOffset()}; path=/; max-age=31536000; samesite=lax`;
    applyStoredTheme();
  }, []);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
