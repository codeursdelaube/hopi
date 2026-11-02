"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import { DAILY_GOALS, LEVELS } from "@/lib/learn/options";

const onboardingSchema = z.object({
  fieldId: z.uuid(),
  level: z.enum(LEVELS),
  dailyGoal: z.union(DAILY_GOALS.map((g) => z.literal(g))),
  /** Page à ouvrir ensuite (ex. le défi d'un ami) ; uniquement un chemin interne. */
  next: z.string().max(200).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OnboardingResult = { ok: false };

/** Enregistre filière, niveau et objectif, puis ouvre le parcours. */
export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  // Seules les filières publiées peuvent être choisies.
  const { data: field } = await supabase
    .from("fields")
    .select("id")
    .eq("id", parsed.data.fieldId)
    .eq("is_published", true)
    .maybeSingle();
  if (!field) return { ok: false };

  // Le client « utilisateur » suffit : RLS + droits par colonne n'autorisent que ces champs.
  const { error } = await supabase
    .from("profiles")
    .update({
      field_id: field.id,
      level: parsed.data.level,
      daily_goal_xp: parsed.data.dailyGoal,
    })
    .eq("id", userId);
  if (error) return { ok: false };

  redirect(safeNextPath(parsed.data.next));
}
