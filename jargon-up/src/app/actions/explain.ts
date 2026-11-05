"use server";

import { z } from "zod";
import {
  AI_EXPLAIN,
  EXPLAIN_SYSTEM_PROMPT,
  buildExplainPrompt,
  cleanExplanation,
} from "@/lib/ai/explain";
import { generateText, isAiExplainAvailable } from "@/lib/ai/gemini";
import { requireProfile } from "@/lib/auth/session";
import { isCorrect } from "@/lib/exercises/grade";
import { toPlayable } from "@/lib/exercises/load";
import { answerSchema } from "@/lib/exercises/schemas";
import { buildReviewForTerms } from "@/lib/review/build";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  source: z.enum(["lesson", "review"]),
  exerciseId: z.uuid(),
  answer: answerSchema,
  attempt: z.number().int().min(1).max(AI_EXPLAIN.maxAttempts),
  previousMistakes: z.number().int().min(0).max(50),
});

export type ExplainInput = z.infer<typeof inputSchema>;

export type ExplainResult =
  | { ok: true; text: string; remaining: number }
  | { ok: false; reason: "limit" | "unavailable" | "invalid" };

/** L'exercice est relu côté serveur : le navigateur ne choisit pas ce qui est envoyé à l'IA. */
async function loadExercise(input: ExplainInput, userId: string, fieldId: string | null) {
  if (input.source === "review") {
    if (!fieldId) return null;
    const [exercise] = await buildReviewForTerms(userId, fieldId, [input.exerciseId]);
    return exercise ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, type, payload, explanation_fr, term_id")
    .eq("id", input.exerciseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (toPlayable([data])[0] ?? null) : null;
}

/** Explique une erreur avec l'IA, dans la limite quotidienne de chaque élève. */
export async function explainMistake(raw: ExplainInput): Promise<ExplainResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const input = parsed.data;

  let reservedId: number | null = null;
  const admin = createAdminClient();
  try {
    const profile = await requireProfile();
    if (!(await isAiExplainAvailable())) return { ok: false, reason: "unavailable" };

    const exercise = await loadExercise(input, profile.id, profile.field_id);
    // Seulement pour une vraie erreur : une bonne réponse n'appelle pas l'IA.
    if (!exercise || isCorrect(exercise, input.answer)) return { ok: false, reason: "invalid" };
    const prompt = buildExplainPrompt({
      exercise,
      answer: input.answer,
      level: profile.level,
      attempt: input.attempt,
      previousMistakes: input.previousMistakes,
    });
    if (!prompt) return { ok: false, reason: "invalid" };

    // On réserve la place AVANT l'appel, puis on compte : des demandes simultanées ne
    // peuvent pas dépasser la limite. La place est rendue si l'IA échoue.
    const { data: reserved, error: reserveError } = await admin
      .from("ai_explanations")
      .insert({ user_id: profile.id })
      .select("id")
      .single();
    if (reserveError) throw new Error(reserveError.message);
    reservedId = reserved.id;

    const dayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
    const { count, error: countError } = await admin
      .from("ai_explanations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("created_at", dayStart);
    if (countError) throw new Error(countError.message);
    const used = count ?? 0;
    if (used > AI_EXPLAIN.dailyLimit) {
      await admin.from("ai_explanations").delete().eq("id", reservedId);
      return { ok: false, reason: "limit" };
    }

    const text = cleanExplanation(await generateText(EXPLAIN_SYSTEM_PROMPT, prompt));
    return { ok: true, text, remaining: AI_EXPLAIN.dailyLimit - used };
  } catch (e) {
    console.error("explainMistake :", e instanceof Error ? e.message : e);
    if (reservedId !== null) await admin.from("ai_explanations").delete().eq("id", reservedId);
    return { ok: false, reason: "unavailable" };
  }
}
