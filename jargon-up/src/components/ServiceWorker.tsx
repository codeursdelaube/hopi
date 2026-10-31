"use client";

import { useEffect } from "react";

/** Enregistre le service worker (PWA installable + hors-ligne), en production uniquement. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      console.warn("Service worker non enregistré :", e);
    });
  }, []);
  return null;
}
