import { z } from "zod";

/**
 * Format des fichiers de contenu (src/content/<filière>/course.json).
 * Les positions sont déduites de l'ordre dans les tableaux (1, 2, 3…).
 */
export const levelSchema = z.enum(["A2", "B1", "B2"]);

export const lessonSchema = z.object({
  title_en: z.string().min(1),
  xp_reward: z.number().int().min(0).default(10),
});

export const unitSchema = z.object({
  level: levelSchema,
  title_en: z.string().min(1),
  title_fr: z.string().min(1),
  lessons: z.array(lessonSchema).min(1),
});

export const courseSchema = z.object({
  field: z.string().min(1),
  units: z.array(unitSchema).min(1),
});

export type Course = z.infer<typeof courseSchema>;
