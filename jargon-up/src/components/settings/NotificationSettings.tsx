"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, BellRing, Send } from "lucide-react";
import {
  saveNotificationPrefs,
  sendTestNotification,
  subscribePush,
  unsubscribePush,
} from "@/app/(app)/settings/notification-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.notifications;

type Support = "checking" | "ok" | "unsupported" | "ios-install" | "denied";

/** Clé publique VAPID (base64url) → format attendu par pushManager.subscribe. */
function toUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function getRegistration() {
  // En développement le service worker n'est pas enregistré au démarrage : on le fait ici.
  return (
    (await navigator.serviceWorker.getRegistration()) ??
    (await navigator.serviceWorker.register("/sw.js"))
  );
}

function detectSupport(): Support {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return isIOS && !standalone ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

export function NotificationSettings({
  initialPrefs,
}: {
  /** null : migration pas encore appliquée (colonnes absentes). */
  initialPrefs: { word: boolean; reviews: boolean } | null;
}) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [support, setSupport] = useState<Support>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState(initialPrefs ?? { word: true, reviews: true });
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const s = detectSupport();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- APIs du navigateur (client uniquement)
    setSupport(s);
    if (s !== "ok") return;
    void navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)));
  }, []);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        if (!publicKey) throw new Error("no-key");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setSupport(permission === "denied" ? "denied" : "ok");
          return;
        }
        const reg = await getRegistration();
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: toUint8Array(publicKey),
          }));
        const json = sub.toJSON();
        const result = await subscribePush({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        });
        if (!result.ok) throw new Error("save");
        setSubscribed(true);
        setMessage({ tone: "ok", text: t.enabled });
      } catch (e) {
        const noKey = e instanceof Error && e.message === "no-key";
        setMessage({ tone: "error", text: noKey ? t.notConfigured : t.error });
      }
    });
  }

  function disable() {
    setMessage(null);
    startTransition(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    });
  }

  function updatePrefs(next: typeof prefs) {
    setPrefs(next);
    startTransition(async () => {
      const result = await saveNotificationPrefs(next);
      if (!result.ok) setMessage({ tone: "error", text: fr.settings.error });
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestNotification();
      setMessage(result.ok ? { tone: "ok", text: t.testSent } : { tone: "error", text: t.error });
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Bell className="size-5 text-primary" aria-hidden /> {t.title}
      </h2>
      <p className="text-sm text-base-content/70">{t.intro}</p>

      {initialPrefs === null ? (
        <p className="text-sm text-base-content/60">{t.unavailable}</p>
      ) : support === "checking" ? (
        <div className="h-12 w-full skeleton" />
      ) : support === "unsupported" ? (
        <p className="text-sm text-base-content/60">{t.unsupported}</p>
      ) : support === "ios-install" ? (
        <p className="rounded-box bg-info/10 p-3 text-sm">{t.iosInstall}</p>
      ) : support === "denied" ? (
        <p className="rounded-box bg-warning/15 p-3 text-sm">{t.denied}</p>
      ) : subscribed ? (
        <>
          <p className="flex items-center gap-2 font-semibold text-success">
            <BellRing className="size-5" aria-hidden /> {t.enabled}
          </p>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
            <span>{t.word}</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={prefs.word}
              disabled={pending}
              onChange={(e) => updatePrefs({ ...prefs, word: e.target.checked })}
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
            <span>{t.reviews}</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={prefs.reviews}
              disabled={pending}
              onChange={(e) => updatePrefs({ ...prefs, reviews: e.target.checked })}
            />
          </label>
          <p className="text-xs text-base-content/60">{t.schedule}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={test} disabled={pending} className="btn btn-sm">
              <Send className="size-4" aria-hidden /> {t.test}
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={pending}
              className="btn btn-ghost btn-sm"
            >
              <BellOff className="size-4" aria-hidden /> {t.disable}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={pending}
          className="btn w-full btn-pop btn-primary"
        >
          {pending ? (
            <span className="loading loading-spinner" aria-hidden />
          ) : (
            <Bell className="size-5" aria-hidden />
          )}
          {t.enable}
        </button>
      )}

      {message && (
        <p role="status" className={message.tone === "ok" ? "text-success" : "text-error"}>
          {message.text}
        </p>
      )}
    </section>
  );
}
