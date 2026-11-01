import "server-only";
import webpush, { WebPushError } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import type { PushMessage } from "@/lib/push/reminder";

let configured = false;

/** Configure web-push avec les clés VAPID (voir `npm run setup:push`). */
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Clés VAPID manquantes : lancer `npm run setup:push` et les ajouter à Vercel.");
  }
  // Le « subject » identifie l'expéditeur auprès des services push (URL du site).
  webpush.setVapidDetails(SITE_URL, publicKey, privateKey);
  configured = true;
}

type Subscription = { endpoint: string; p256dh: string; auth: string };

/**
 * Envoie un message à une liste d'abonnements. Les abonnements expirés
 * (appareil désinstallé, permission retirée : codes 404 / 410) sont supprimés.
 * Renvoie le nombre d'envois réussis.
 */
export async function sendPush(subscriptions: Subscription[], message: PushMessage) {
  ensureConfigured();
  const payload = JSON.stringify(message);
  const expired: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 6, urgency: "normal" },
        );
        sent++;
      } catch (e) {
        if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) {
          expired.push(sub.endpoint);
        } else {
          console.error("Envoi push :", e instanceof Error ? e.message : e);
        }
      }
    }),
  );

  if (expired.length > 0) {
    await createAdminClient().from("push_subscriptions").delete().in("endpoint", expired);
  }
  return sent;
}
