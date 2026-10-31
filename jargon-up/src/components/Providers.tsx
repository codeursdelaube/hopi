"use client";

import { MotionConfig } from "motion/react";

/** Fournisseurs globaux côté client. `reducedMotion="user"` suit le réglage système. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
