"use client";

import { useEffect } from "react";
import { touchPresence } from "@/app/actions/presence";

const KEY = "hopi-presence";

/** Signale la visite au serveur une fois par session (sert aux relances après 3 jours d'absence). */
export function PresencePing() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Stockage indisponible : on signale quand même, sans dédoublonnage.
    }
    void touchPresence();
  }, []);
  return null;
}
