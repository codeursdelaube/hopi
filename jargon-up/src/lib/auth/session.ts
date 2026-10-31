import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "@/lib/auth/paths";
import type { Row } from "@/types/database";

export type Profile = Pick<
  Row<"profiles">,
  | "id"
  | "display_name"
  | "avatar_url"
  | "field_id"
  | "level"
  | "daily_goal_xp"
  | "total_xp"
  | "current_streak"
  | "plan"
  | "sound_enabled"
>;

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
    .single();

  if (error || !profile) {
    throw new Error(
      `Profil introuvable pour l'utilisateur connecté : ${error?.message ?? "aucune ligne"}`,
    );
  }
  return profile;
});
