"use client";

import { useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { OPEN_INSTALL_EVENT } from "@/components/pwa/InstallPrompt";
import { fr } from "@/lib/i18n/fr";

const standaloneQuery = "(display-mode: standalone)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(standaloneQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Rouvre la fenêtre d'installation (masqué si Hopi est déjà installé et ouvert en appli). */
export function InstallButton() {
  const installed = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(standaloneQuery).matches,
    () => true, // rendu serveur : masqué, puis affiché côté client si besoin
  );
  if (installed) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL_EVENT))}
      className="btn btn-outline"
    >
      <Download className="size-5" aria-hidden /> {fr.pwa.settingsButton}
    </button>
  );
}
