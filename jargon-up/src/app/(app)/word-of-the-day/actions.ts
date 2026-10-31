"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { awardXp } from "@/lib/game/engine";
import type { GameSummary } from "@/lib/game/types";
import { XP } from "@/lib/gamification/xp";
import { hasClaimedWordOfDay } from "@/lib/words/daily";

export type ClaimResult = { ok: true; summary: GameSummary } | { ok: false };

/** Valide le mot du jour : +3 XP, une seule fois par jour. */
export async function claimWordOfDay(offsetMinutes: number): Promise<ClaimResult> {
  const offset = z.number().int().safeParse(offsetMinutes);
  if (!offset.success) return { ok: false };

  try {
    const profile = await requireProfile();
    if (await hasClaimedWordOfDay(profile.id)) return { ok: false };

    const summary = await awardXp({
      userId: profile.id,
      amount: XP.wordOfDay,
      source: "word_of_day",
      offsetMinutes: offset.data,
    });
    revalidatePath("/learn");
    return { ok: true, summary };
  } catch (e) {
    console.error("claimWordOfDay :", e);
    return { ok: false };
  }
}
