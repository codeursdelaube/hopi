"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Supprime définitivement le compte de l'utilisateur connecté.
 * Supprimer l'utilisateur d'authentification efface en cascade (clés étrangères
 * « on delete cascade ») : profil, progression, révisions, XP, badges, abonnements push.
 */
export async function deleteAccount(): Promise<{ ok: false }> {
  const profile = await requireProfile();

  const { error } = await createAdminClient().auth.admin.deleteUser(profile.id);
  if (error) {
    console.error("deleteAccount :", error.message);
    return { ok: false };
  }

  // Efface les cookies de session de ce navigateur.
  await (await createClient()).auth.signOut();
  redirect("/?compte=supprime");
}
