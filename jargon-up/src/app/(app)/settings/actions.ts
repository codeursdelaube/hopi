"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { DAILY_GOALS, LEVELS } from "@/lib/learn/options";
import { createClient } from "@/lib/supabase/server";

const settingsSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  dailyGoal: z.union(DAILY_GOALS.map((g) => z.literal(g))),
  level: z.enum(LEVELS),
  soundEnabled: z.boolean(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

/** Préférences modifiables par l'utilisateur (droits par colonne côté base). */
export async function saveSettings(input: SettingsInput): Promise<{ ok: boolean }> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      daily_goal_xp: parsed.data.dailyGoal,
      level: parsed.data.level,
      sound_enabled: parsed.data.soundEnabled,
    })
    .eq("id", profile.id);
  if (error) {
    console.error("saveSettings :", error.message);
    return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
