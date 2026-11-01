"use server";

import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { sendPush } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export type PushSubscriptionInput = z.infer<typeof subscriptionSchema>;

/** Enregistre l'abonnement push de cet appareil pour l'utilisateur connecté. */
export async function subscribePush(input: PushSubscriptionInput): Promise<{ ok: boolean }> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const profile = await requireProfile();

  const { error } = await createAdminClient().from("push_subscriptions").upsert(
    {
      user_id: profile.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) console.error("subscribePush :", error.message);
  return { ok: !error };
}

/** Désabonne cet appareil. */
export async function unsubscribePush(endpoint: string): Promise<{ ok: boolean }> {
  if (!z.url().safeParse(endpoint).success) return { ok: false };
  const profile = await requireProfile();
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", profile.id);
  return { ok: !error };
}

const prefsSchema = z.object({ word: z.boolean(), reviews: z.boolean() });

/** Quels rappels recevoir (droits par colonne : l'utilisateur ne modifie que ces champs). */
export async function saveNotificationPrefs(
  input: z.infer<typeof prefsSchema>,
): Promise<{ ok: boolean }> {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ notify_word_of_day: parsed.data.word, notify_reviews: parsed.data.reviews })
    .eq("id", profile.id);
  return { ok: !error };
}

/** Envoie une notification de test sur tous les appareils de l'utilisateur. */
export async function sendTestNotification(): Promise<{ ok: boolean }> {
  const profile = await requireProfile();
  const { data: subs } = await createAdminClient()
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", profile.id);
  if (!subs || subs.length === 0) return { ok: false };

  try {
    const sent = await sendPush(subs, {
      title: fr.notifications.testTitle,
      body: fr.notifications.testBody,
      url: "/learn",
      tag: "test",
    });
    return { ok: sent > 0 };
  } catch (e) {
    console.error("sendTestNotification :", e);
    return { ok: false };
  }
}
