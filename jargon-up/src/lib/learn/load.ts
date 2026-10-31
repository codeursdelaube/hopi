import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildPath, type PathUnit } from "@/lib/learn/path";
import type { Profile } from "@/lib/auth/session";

/** Charge le parcours complet de la filière de l'utilisateur, avec l'état de chaque leçon. */
export async function loadPath(profile: Profile): Promise<PathUnit[]> {
  if (!profile.field_id) return [];
  const supabase = await createClient();

  const [unitsRes, progressRes] = await Promise.all([
    supabase
      .from("units")
      .select("id, level, position, title_en, title_fr")
      .eq("field_id", profile.field_id)
      .order("position"),
    supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", profile.id)
      .not("completed_at", "is", null),
  ]);
  if (unitsRes.error) throw new Error(`Chargement des unités : ${unitsRes.error.message}`);
  if (progressRes.error) {
    throw new Error(`Chargement de la progression : ${progressRes.error.message}`);
  }
  if (unitsRes.data.length === 0) return [];

  const lessonsRes = await supabase
    .from("lessons")
    .select("id, unit_id, position, title_en, xp_reward")
    .in(
      "unit_id",
      unitsRes.data.map((u) => u.id),
    )
    .order("position");
  if (lessonsRes.error) throw new Error(`Chargement des leçons : ${lessonsRes.error.message}`);

  return buildPath(
    unitsRes.data.map((u) => ({
      ...u,
      lessons: lessonsRes.data.filter((l) => l.unit_id === u.id),
    })),
    new Set(progressRes.data.map((p) => p.lesson_id)),
    profile.level,
  );
}
