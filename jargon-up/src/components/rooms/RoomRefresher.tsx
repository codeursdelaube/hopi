"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Tient l'écran à jour en relisant la page à intervalle régulier, seulement quand l'onglet est
 * visible, et tout de suite au retour dans l'appli (ex. après avoir partagé le lien).
 */
export function RoomRefresher({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [intervalMs, router]);

  return null;
}
