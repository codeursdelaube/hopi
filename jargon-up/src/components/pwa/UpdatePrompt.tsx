"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Mascot } from "@/components/game/Mascot";
import { fr } from "@/lib/i18n/fr";

const t = fr.pwa;
const CURRENT = process.env.NEXT_PUBLIC_APP_VERSION;
const CHECK_EVERY = 15 * 60_000;
/** Pas d'interruption pendant une leçon ou une révision : la fenêtre attend la fin. */
const QUIET_PATHS = ["/lesson", "/review"];

/**
 * Détecte une nouvelle version en ligne (nouveau déploiement) et propose de l'installer.
 * Vérifie au retour sur l'appli et toutes les 15 minutes ; rien n'est forcé.
 */
export function UpdatePrompt() {
  const pathname = usePathname();
  const [available, setAvailable] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!CURRENT) return;
    let stopped = false;

    async function check() {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!stopped && version && version !== CURRENT) setAvailable(version);
      } catch {
        // Hors ligne ou réseau instable : on réessaiera plus tard.
      }
    }

    const first = window.setTimeout(check, 10_000);
    const interval = window.setInterval(check, CHECK_EVERY);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const quiet = QUIET_PATHS.some((p) => pathname.startsWith(p));
  if (!available || available === dismissed || quiet) return null;

  async function update() {
    setUpdating(true);
    try {
      // Nouveau service worker + pages en cache effacées : tout est rechargé depuis la nouvelle version.
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.includes("-pages")).map((k) => caches.delete(k)));
    } catch {
      // Même en cas d'échec ici, le rechargement récupère la nouvelle version.
    }
    window.location.reload();
  }

  return (
    <div
      className="modal modal-open modal-bottom sm:modal-middle"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-title"
    >
      <div className="modal-box flex flex-col items-center gap-4 text-center">
        <Mascot mood="proud" size={100} />
        <h2
          id="update-title"
          className="flex items-center gap-2 font-display text-2xl font-bold text-primary"
        >
          <Sparkles className="size-6 text-warning" aria-hidden /> {t.updateTitle}
        </h2>
        <p className="text-base-content/70">{t.updateText}</p>
        <div className="modal-action mt-0 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => void update()}
            disabled={updating}
            className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
            autoFocus
          >
            {updating && <span className="loading loading-spinner" aria-hidden />}
            {updating ? t.updating : t.update}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(available)}
            disabled={updating}
            className="btn w-full btn-ghost"
          >
            {t.later}
          </button>
        </div>
      </div>
    </div>
  );
}
