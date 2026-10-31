/**
 * Format des fichiers de contenu : src/content/<slug-filière>/units/NN-nom.json
 * (une unité par fichier, triées par nom). Positions déduites de l'ordre des tableaux.
 * Pas d'alias `@/` : ce fichier est aussi lu par scripts/seed-content.ts.
 */
import { z } from "zod";

export const levelSchema = z.enum(["A2", "B1", "B2"]);

export const termSchema = z.object({
  term: z.string().min(1),
  pos: z.string().min(1),
  /** Traduction courte, utilisée pour les exercices d'association. */
  translation_fr: z.string().min(1),
  definition_en: z.string().min(1),
  explanation_fr: z.string().min(1),
  /** Doit contenir le terme tel quel (il sert aux phrases à trous). */
  example_en: z.string().min(1),
  example_fr: z.string().min(1),
  ipa: z.string().optional(),
});

export const sentenceSchema = z.object({ en: z.string().min(1), fr: z.string().min(1) });

export const dialogueSchema = z.object({
  context: z.string().min(1),
  lines: z.array(z.object({ speaker: z.string().min(1), text: z.string().min(1) })).min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  answerIndex: z.number().int().min(0),
  explanation_fr: z.string().min(1),
});

export const lessonSchema = z.object({
  title_en: z.string().min(1),
  xp_reward: z.number().int().min(0).default(10),
  terms: z.array(termSchema).length(8),
  sentences: z.array(sentenceSchema).min(1),
  dialogues: z.array(dialogueSchema).default([]),
});

export const unitSchema = z.object({
  level: levelSchema,
  title_en: z.string().min(1),
  title_fr: z.string().min(1),
  lessons: z.array(lessonSchema).min(1),
});

export type ContentTerm = z.infer<typeof termSchema>;
export type ContentLesson = z.infer<typeof lessonSchema>;
export type ContentUnit = z.infer<typeof unitSchema>;
