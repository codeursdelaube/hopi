import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "@/lib/auth/paths";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  field_id: string | null;
  level: string;
  daily_goal_xp: number;
  total_xp: number;
  current_streak: number;
  plan: "free" | "premium";
  sound_enabled: boolean;
};

/**
 * Profil de l'utilisateur connecté, ou redirection vers /login.
 * Mis en cache pour la durée d'une requête (layout + page ne font qu'un appel).
 */
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect(LOGIN_PATH);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, field_id, level, daily_goal_xp, total_xp, current_streak, plan, sound_enabled",
    )
    .eq("id", userId)
    .single<Profile>();

  if (error || !profile) {
    throw new Error(
      `Profil introuvable pour l'utilisateur connecté : ${error?.message ?? "aucune ligne"}`,
    );
  }
  return profile;
});
