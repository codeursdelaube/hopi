"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, BellRing, Clock, Send } from "lucide-react";
import {
  saveNotificationPrefs,
  sendTestNotification,
  unsubscribePush,
} from "@/app/(app)/settings/notification-actions";
import {
  detectPushSupport,
  enablePushOnThisDevice,
  isSubscribedOnThisDevice,
  type PushSupport,
} from "@/lib/push/client";
import { MAX_REMINDER_HOURS, REMINDER_HOUR_CHOICES } from "@/lib/push/reminder";
import { fr } from "@/lib/i18n/fr";

type Prefs = { word: boolean; reviews: boolean; hours: number[] };
const DEFAULT_PREFS: Prefs = { word: true, reviews: true, hours: [18] };

const t = fr.notifications;

type Support = "checking" | PushSupport;

export function NotificationSettings({
  initialPrefs,
}: {
  /** null : migration pas encore appliquée (colonnes absentes). */
  initialPrefs: Prefs | null;
}) {
  const [support, setSupport] = useState<Support>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs ?? DEFAULT_PREFS);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const s = detectPushSupport();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- APIs du navigateur (client uniquement)
    setSupport(s);
    if (s !== "ok") return;
    void isSubscribedOnThisDevice().then(setSubscribed);
  }, []);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      const result = await enablePushOnThisDevice();
      if (result === "denied") return setSupport("denied");
      if (result === "dismissed") return;
      if (result !== "ok") {
        setMessage({ tone: "error", text: result === "no-key" ? t.notConfigured : t.error });
        return;
      }
      // Enregistre aussi les préférences affichées (heures, types de rappels).
      await saveNotificationPrefs({ ...prefs, offsetMinutes: new Date().getTimezoneOffset() });
      setSubscribed(true);
      setMessage({ tone: "ok", text: t.enabled });
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

  function updatePrefs(next: Prefs) {
    setPrefs(next);
    startTransition(async () => {
      const result = await saveNotificationPrefs({
        ...next,
        offsetMinutes: new Date().getTimezoneOffset(),
      });
      if (!result.ok) setMessage({ tone: "error", text: fr.settings.error });
    });
  }

  function toggleHour(hour: number) {
    const has = prefs.hours.includes(hour);
    if (has && prefs.hours.length === 1) return; // au moins une heure
    if (!has && prefs.hours.length >= MAX_REMINDER_HOURS) {
      setMessage({ tone: "error", text: t.maxHours(MAX_REMINDER_HOURS) });
      return;
    }
    setMessage(null);
    const hours = has ? prefs.hours.filter((h) => h !== hour) : [...prefs.hours, hour];
    updatePrefs({ ...prefs, hours: hours.sort((a, b) => a - b) });
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
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex items-center gap-2 font-semibold">
              <Clock className="size-4 text-primary" aria-hidden /> {t.hours}
            </legend>
            <div className="flex flex-wrap gap-2">
              {REMINDER_HOUR_CHOICES.map((hour) => {
                const on = prefs.hours.includes(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    aria-pressed={on}
                    disabled={pending}
                    onClick={() => toggleHour(hour)}
                    className={`btn min-h-11 btn-sm ${on ? "btn-primary" : "btn-outline"}`}
                  >
                    {t.hourLabel(hour)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-base-content/60">{t.schedule}</p>
          </fieldset>
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
