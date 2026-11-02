"use client";

import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { Mascot } from "@/components/game/Mascot";
import {
  detectPushSupport,
  enablePushOnThisDevice,
  isSubscribedOnThisDevice,
  type EnableResult,
} from "@/lib/push/client";
import { fr } from "@/lib/i18n/fr";

const t = fr.notifPrompt;
const SEEN_KEY = "hopi-notif-prompt-seen";

function seen(action: "get" | "set") {
  try {
    if (action === "set") localStorage.setItem(SEEN_KEY, "1");
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // stockage indisponible : on ne risque pas de redemander à chaque page
  }
}

/** Une autre fenêtre (ex. installation) est-elle déjà ouverte ? */
function otherModalOpen() {
  return document.querySelector(".modal-open") !== null;
}

/**
 * À la première connexion (une fois par appareil), propose d'autoriser les notifications.
 * Ne s'affiche pas si le téléphone ne les permet pas, si elles sont déjà actives, ou si une
 * autre fenêtre est ouverte (elle attend qu'elle se ferme).
 */
export function NotificationPrompt() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EnableResult | null>(null);

  useEffect(() => {
    if (seen("get") || detectPushSupport() !== "ok") return;
    let stopped = false;
    let timer = 0;

    const tryOpen = async (attempt: number) => {
      if (stopped) return;
      if (await isSubscribedOnThisDevice()) {
        seen("set");
        return;
      }
      if (otherModalOpen()) {
        // On réessaie plus tard (au plus ~2 minutes).
        if (attempt < 60) timer = window.setTimeout(() => void tryOpen(attempt + 1), 2000);
        return;
      }
      seen("set");
      setOpen(true);
    };

    timer = window.setTimeout(() => void tryOpen(0), 3000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!open) return null;

  async function enable() {
    setBusy(true);
    const r = await enablePushOnThisDevice();
    setBusy(false);
    if (r === "dismissed") return setOpen(false);
    setResult(r);
  }

  const message =
    result === "ok"
      ? { tone: "text-success", text: t.done }
      : result === "denied"
        ? { tone: "text-warning", text: t.denied }
        : result
          ? { tone: "text-error", text: t.error }
          : null;

  return (
    <div
      className="modal modal-open modal-bottom sm:modal-middle"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-prompt-title"
    >
      <div className="modal-box flex flex-col items-center gap-4 text-center">
        <Mascot mood={result === "ok" ? "proud" : "happy"} size={110} />
        <h2
          id="notif-prompt-title"
          className="flex items-center gap-2 font-display text-2xl font-bold"
        >
          <BellRing className="size-6 text-primary" aria-hidden /> {t.title}
        </h2>

        {message ? (
          <p role="status" className={`font-semibold ${message.tone}`}>
            {message.text}
          </p>
        ) : (
          <>
            <p className="text-base-content/70">{t.text}</p>
            <ul className="flex w-full flex-col gap-2 text-left">
              {t.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 size-5 shrink-0 text-success"
                    strokeWidth={3}
                    aria-hidden
                  />
                  {perk}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="modal-action mt-0 flex w-full flex-col gap-2">
          {!message && (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy}
              className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
              autoFocus
            >
              {busy ? (
                <span className="loading loading-spinner" aria-hidden />
              ) : (
                <BellRing className="size-5" aria-hidden />
              )}
              {t.enable}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="btn w-full btn-ghost"
            autoFocus={Boolean(message)}
          >
            {message ? t.close : t.later}
          </button>
        </div>
      </div>
    </div>
  );
}
