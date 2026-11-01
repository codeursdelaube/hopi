"use server";

import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { isCorrect } from "@/lib/exercises/grade";
import { toPlayable } from "@/lib/exercises/load";
import { answerSchema } from "@/lib/exercises/schemas";
import { awardXp, recordTermResults, xpEarnedToday } from "@/lib/game/engine";
import type { FinishInput, FinishResult } from "@/lib/game/types";
import { XP, lessonXp, scorePercent } from "@/lib/gamification/xp";
import { loadPath } from "@/lib/learn/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  answers: z.array(z.object({ exerciseId: z.uuid(), answer: answerSchema })).max(60),
  offsetMinutes: z.number().int(),
});

/**
 * Fin de leçon. Le score est RECALCULÉ ici à partir des réponses du premier essai :
 * le client ne peut pas annoncer lui-même son score ou ses XP.
 */
export async function completeLesson(lessonId: string, raw: FinishInput): Promise<FinishResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!z.uuid().safeParse(lessonId).success || !parsed.success) return { ok: false };
  const { answers, offsetMinutes } = parsed.data;

  try {
    const profile = await requireProfile();
    const supabase = await createClient();
    const admin = createAdminClient();

    // Toutes les lectures en parallèle : sur un réseau serveur ↔ base à ~100 ms par
    // aller-retour, les enchaîner ajoutait plus d'une seconde d'attente en fin de leçon.
    const [path, exercisesRes, alreadyToday, previousRes] = await Promise.all([
      loadPath(profile),
      supabase
        .from("exercises")
        .select("id, type, payload, explanation_fr, term_id")
        .eq("lesson_id", lessonId),
      xpEarnedToday(profile.id, offsetMinutes, "lesson"),
      admin
        .from("lesson_progress")
        .select("best_score, completed_at")
        .eq("user_id", profile.id)
        .eq("lesson_id", lessonId)
        .maybeSingle(),
    ]);
    const lesson = path.flatMap((u) => u.lessons).find((l) => l.id === lessonId);
    if (!lesson || lesson.state === "locked") return { ok: false };
    if (exercisesRes.error) throw new Error(exercisesRes.error.message);
    const exercises = toPlayable(exercisesRes.data);

    // Chaque exercice doit avoir une réponse.
    const byId = new Map(answers.map((a) => [a.exerciseId, a.answer]));
    if (exercises.length === 0 || exercises.some((e) => !byId.has(e.id))) return { ok: false };

    const graded = exercises.map((e) => ({ exercise: e, correct: isCorrect(e, byId.get(e.id)!) }));
    const correct = graded.filter((g) => g.correct).length;
    const total = graded.length;

    // Plafond quotidien d'XP de leçons (évite de « farmer » la même leçon).
    const earned = lessonXp(lesson.xp_reward, correct, total);
    const allowed = Math.max(0, Math.min(earned, XP.lessonDailyCap - alreadyToday));

    // Progression (meilleur score conservé) et répétition espacée, en parallèle.
    const previous = previousRes.data;
    const score = scorePercent(correct, total);
    const [{ error: progressError }] = await Promise.all([
      admin.from("lesson_progress").upsert(
        {
          user_id: profile.id,
          lesson_id: lessonId,
          best_score: Math.max(score, previous?.best_score ?? 0),
          completed_at: previous?.completed_at ?? new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      ),
      recordTermResults(
        profile.id,
        graded.flatMap((g) =>
          g.exercise.termId ? [{ termId: g.exercise.termId, correct: g.correct }] : [],
        ),
      ),
    ]);
    if (progressError) throw new Error(progressError.message);

    // Après l'écriture de la progression (le badge « première leçon » en dépend).
    const summary = await awardXp({
      userId: profile.id,
      amount: allowed,
      source: "lesson",
      offsetMinutes,
      perfectLesson: correct === total,
    });

    return { ok: true, summary, correct, total, capped: allowed < earned };
  } catch (e) {
    console.error("completeLesson :", e);
    return { ok: false };
  }
}
