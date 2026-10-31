/**
 * Formats des exercices (colonne `exercises.payload`) et des réponses.
 * Partagé par l'appli, le serveur (correction) et le script d'import :
 * pas d'alias `@/` ici, pour que Node puisse l'exécuter directement.
 */
import { z } from "zod";

export const multipleChoicePayload = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  answerIndex: z.number().int().min(0),
});

export const matchPairsPayload = z.object({
  pairs: z
    .array(z.object({ left: z.string().min(1), right: z.string().min(1) }))
    .min(2)
    .max(5),
});

export const fillBlankPayload = z.object({
  /** Phrase avec « ___ » à l'endroit du mot manquant. */
  sentence: z.string().includes("___"),
  answer: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(4),
  translation_fr: z.string().optional(),
});

export const orderWordsPayload = z.object({
  words: z.array(z.string().min(1)).min(2),
  answer: z.string().min(1),
  translation_fr: z.string().optional(),
});

export const listenTypePayload = z.object({
  text: z.string().min(1),
  accept: z.array(z.string().min(1)).min(1),
});

export const dialoguePayload = z.object({
  context: z.string().min(1),
  lines: z.array(z.object({ speaker: z.string().min(1), text: z.string().min(1) })).min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  answerIndex: z.number().int().min(0),
});

export const exerciseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("multiple_choice"), payload: multipleChoicePayload }),
  z.object({ type: z.literal("match_pairs"), payload: matchPairsPayload }),
  z.object({ type: z.literal("fill_blank"), payload: fillBlankPayload }),
  z.object({ type: z.literal("order_words"), payload: orderWordsPayload }),
  z.object({ type: z.literal("listen_type"), payload: listenTypePayload }),
  z.object({ type: z.literal("dialogue"), payload: dialoguePayload }),
]);

export type ExerciseContent = z.infer<typeof exerciseSchema>;
export type ExerciseKind = ExerciseContent["type"];

/** Exercice prêt à jouer, tel que transmis au client. */
export type PlayableExercise = ExerciseContent & {
  id: string;
  termId: string | null;
  explanation_fr: string | null;
};

/** Réponse de l'utilisateur, selon le type d'exercice. */
export const answerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("multiple_choice"), index: z.number().int() }),
  z.object({ type: z.literal("dialogue"), index: z.number().int() }),
  z.object({ type: z.literal("fill_blank"), choice: z.string() }),
  z.object({ type: z.literal("order_words"), words: z.array(z.string()) }),
  z.object({ type: z.literal("listen_type"), text: z.string().max(200) }),
  /** Les paires se jouent jusqu'au bout : on transmet seulement le nombre d'erreurs. */
  z.object({ type: z.literal("match_pairs"), mistakes: z.number().int().min(0) }),
]);

export type Answer = z.infer<typeof answerSchema>;
