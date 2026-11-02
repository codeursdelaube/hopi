import { subscribePush } from "@/app/(app)/settings/notification-actions";

/**
 * Notifications push côté navigateur : détection de la compatibilité et abonnement de
 * l'appareil. Partagé par les Réglages et la fenêtre de première connexion.
 */

export type PushSupport = "ok" | "unsupported" | "ios-install" | "denied";
export type EnableResult = "ok" | "denied" | "dismissed" | "no-key" | "error";

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

export function detectPushSupport(): PushSupport {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    // Sur iPhone, les notifications ne marchent qu'une fois Hopi installé sur l'écran d'accueil.
    return isIOS && !standalone ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

/** Cet appareil est-il déjà abonné ? */
export async function isSubscribedOnThisDevice(): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration();
  return Boolean(await reg?.pushManager.getSubscription());
}

/**
 * Demande l'autorisation (fenêtre du système), abonne l'appareil et l'enregistre côté serveur
 * avec le décalage horaire du téléphone (rappels à l'heure locale).
 */
export async function enablePushOnThisDevice(): Promise<EnableResult> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return "no-key";
  try {
    const permission = await Notification.requestPermission();
    if (permission === "denied") return "denied";
    if (permission !== "granted") return "dismissed";

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
      offsetMinutes: new Date().getTimezoneOffset(),
    });
    return result.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
