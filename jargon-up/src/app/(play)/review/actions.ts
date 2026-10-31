"use server";

import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { isCorrect } from "@/lib/exercises/grade";
import { answerSchema } from "@/lib/exercises/schemas";
import { awardXp, recordTermResults, xpEarnedToday } from "@/lib/game/engine";
import type { FinishInput, FinishResult } from "@/lib/game/types";
import { XP } from "@/lib/gamification/xp";
import { REVIEW_SESSION_SIZE, buildReview } from "@/lib/review/build";

const inputSchema = z.object({
  answers: z
    .array(z.object({ exerciseId: z.uuid(), answer: answerSchema }))
    .min(1)
    .max(REVIEW_SESSION_SIZE),
  offsetMinutes: z.number().int(),
});

/** Fin de révision : correction côté serveur, SM-2, +1 XP par terme juste (plafonné). */
export async function completeReview(raw: FinishInput): Promise<FinishResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const { answers, offsetMinutes } = parsed.data;

  try {
    const profile = await requireProfile();
    if (!profile.field_id) return { ok: false };

    // L'id d'un exercice de révision = l'id du terme ; on reconstruit les mêmes exercices.
    const exercises = await buildReview(
      profile.id,
      profile.field_id,
      answers.map((a) => a.exerciseId),
    );
    const byId = new Map(answers.map((a) => [a.exerciseId, a.answer]));
    if (exercises.length !== answers.length) return { ok: false };

    const graded = exercises.map((e) => ({ termId: e.id, correct: isCorrect(e, byId.get(e.id)!) }));
    const correct = graded.filter((g) => g.correct).length;

    await recordTermResults(profile.id, graded);

    const earned = correct * XP.reviewPerTerm;
    const alreadyToday = await xpEarnedToday(profile.id, offsetMinutes, "review");
    const allowed = Math.max(0, Math.min(earned, XP.reviewDailyCap - alreadyToday));

    const summary = await awardXp({
      userId: profile.id,
      amount: allowed,
      source: "review",
      offsetMinutes,
    });
    return { ok: true, summary, correct, total: graded.length, capped: allowed < earned };
  } catch (e) {
    console.error("completeReview :", e);
    return { ok: false };
  }
}
