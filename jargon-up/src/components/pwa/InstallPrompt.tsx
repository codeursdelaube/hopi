"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Download, Share, SquarePlus } from "lucide-react";
import { Mascot } from "@/components/game/Mascot";
import { INSTALLABLE_EVENT, chromeIntentUrl, isInAppBrowser, isIOS } from "@/lib/pwa-install";
import { fr } from "@/lib/i18n/fr";

const t = fr.pwa;
const SEEN_KEY = "hopi-install-prompt-seen";
/** Événement pour rouvrir la fenêtre depuis les réglages. */
export const OPEN_INSTALL_EVENT = "hopi:open-install";

/** Écrans où l'on n'interrompt pas l'utilisateur (leçon, révision, onboarding). */
const QUIET_PATHS = ["/lesson", "/review", "/onboarding", "/auth"];

/** Temps d'attente max de l'événement d'installation après un toucher sur « Installer ». */
const WAIT_FOR_PROMPT = 3000;

type Help = null | "ios" | "other";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

function storage(action: "get" | "set") {
  try {
    if (action === "set") localStorage.setItem(SEEN_KEY, "1");
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false; // navigation privée : on ne mémorise pas
  }
}

/** Attend l'événement d'installation (il peut arriver quelques secondes après le chargement). */
function waitForInstallEvent(timeout: number) {
  return new Promise<boolean>((resolve) => {
    if (window.__hopiInstall) return resolve(true);
    const done = (ok: boolean) => {
      window.removeEventListener(INSTALLABLE_EVENT, onReady);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const onReady = () => done(true);
    const timer = window.setTimeout(() => done(false), timeout);
    window.addEventListener(INSTALLABLE_EVENT, onReady);
  });
}

/**
 * Propose d'installer Hopi à la PREMIÈRE visite (puis depuis les réglages), avec un bouton
 * « Installer l'appli » toujours présent :
 * - Android (Chrome, Edge, Samsung Internet) : ouvre la vraie fenêtre d'installation du téléphone ;
 * - lien ouvert dans Facebook / Instagram… : rouvre la page dans Chrome, qui sait installer ;
 * - iPhone : Apple n'autorise pas l'installation par bouton → guide en 2 étapes ;
 * - autres navigateurs : guide du menu.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState<Help>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onInstalled = () => {
      storage("set");
      setOpen(false);
    };
    const onOpen = () => {
      setHelp(null);
      setOpen(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(OPEN_INSTALL_EVENT, onOpen);

    // Première visite : on laisse la page s'afficher, puis on propose l'installation.
    const timer = window.setTimeout(() => {
      if (storage("get") || QUIET_PATHS.some((p) => window.location.pathname.startsWith(p))) {
        return;
      }
      storage("set");
      setOpen(true);
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_INSTALL_EVENT, onOpen);
    };
  }, []);

  // Si l'utilisateur arrive dans une leçon pendant que la fenêtre est ouverte, on la ferme.
  const quiet = QUIET_PATHS.some((p) => pathname.startsWith(p));
  if (!open || quiet) return null;

  // La fenêtre ne s'affiche qu'après un effet côté client : `navigator` est disponible ici.
  const ua = navigator.userAgent;
  const inApp = isInAppBrowser(ua);
  const ios = isIOS(ua);

  async function install() {
    // Navigateur intégré (Facebook, Instagram…) : il ne sait pas installer.
    if (inApp) {
      if (ios) setHelp("ios");
      else window.location.href = chromeIntentUrl(window.location.href);
      return;
    }
    // iPhone : Apple ne permet pas l'installation par un bouton.
    if (ios) {
      setHelp("ios");
      return;
    }

    setBusy(true);
    const ready = await waitForInstallEvent(WAIT_FOR_PROMPT);
    const event = window.__hopiInstall;
    if (!ready || !event) {
      setBusy(false);
      setHelp("other");
      return;
    }
    // La vraie fenêtre d'installation du téléphone.
    await event.prompt();
    const { outcome } = await event.userChoice;
    window.__hopiInstall = null; // utilisable une seule fois
    setBusy(false);
    if (outcome === "accepted") {
      storage("set");
      setOpen(false);
    }
  }

  return (
    <div
      className="modal modal-open modal-bottom sm:modal-middle"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      <div className="modal-box flex flex-col items-center gap-4 text-center">
        <Mascot mood="happy" size={110} />
        <h2 id="install-title" className="font-display text-2xl font-bold">
          {t.installTitle}
        </h2>
        <p className="text-base-content/70">{t.installIntro}</p>
        <ul className="flex w-full flex-col gap-2 text-left">
          {t.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <Check className="mt-0.5 size-5 shrink-0 text-success" strokeWidth={3} aria-hidden />
              {perk}
            </li>
          ))}
        </ul>

        {help === "ios" && (
          <div role="status" className="w-full rounded-box bg-base-200 p-3 text-left text-sm">
            <p className="mb-2 font-semibold">{inApp ? t.iosInApp : t.iosSteps}</p>
            <p className="flex items-center gap-2">
              <Share className="size-5 shrink-0 text-info" aria-hidden /> 1. {t.iosStep1}
            </p>
            <p className="mt-1 flex items-center gap-2">
              <SquarePlus className="size-5 shrink-0 text-info" aria-hidden /> 2. {t.iosStep2}
            </p>
          </div>
        )}
        {help === "other" && (
          <p role="status" className="w-full rounded-box bg-base-200 p-3 text-left text-sm">
            {t.otherSteps}
          </p>
        )}

        <div className="modal-action mt-0 flex w-full flex-col gap-2">
          {help === null && (
            <button
              type="button"
              onClick={() => void install()}
              disabled={busy}
              className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
              autoFocus
            >
              {busy ? (
                <span className="loading loading-spinner" aria-hidden />
              ) : (
                <Download className="size-5" aria-hidden />
              )}
              {busy ? t.preparing : inApp && !ios ? t.openInChrome : t.install}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn w-full btn-ghost"
            autoFocus={help !== null}
          >
            {help === null ? t.later : t.close}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label={t.close}
        onClick={() => setOpen(false)}
      />
    </div>
  );
}
