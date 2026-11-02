"use server";

import { requireProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Note la visite de l'utilisateur (appelé une fois par session de navigation) et remet à zéro
 * le compteur de relances d'absence : la prochaine absence repartira du premier message.
 * Silencieux en cas d'échec (par ex. migration pas encore appliquée).
 */
export async function touchPresence(): Promise<void> {
  try {
    const profile = await requireProfile();
    await createAdminClient()
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString(), inactivity_push_count: 0 })
      .eq("id", profile.id);
  } catch {
    // Rien de grave : la présence sera notée à la prochaine visite.
  }
}
