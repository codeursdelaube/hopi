/** Barème d'XP (BRIEFING section 10). */
export const XP = {
  perfectBonus: 5,
  reviewPerTerm: 1,
  wordOfDay: 3,
  /** Plafond quotidien d'XP de révision (anti-abus). */
  reviewDailyCap: 30,
  /** Plafond quotidien d'XP de leçons (anti-abus). */
  lessonDailyCap: 400,
} as const;

/** Pourcentage de bonnes réponses du premier coup (0–100). */
export function scorePercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(correct, total) / total) * 100);
}

/** XP d'une leçon terminée : récompense + bonus si 100 %. */
export function lessonXp(xpReward: number, correct: number, total: number): number {
  const perfect = total > 0 && correct >= total;
  return Math.max(0, xpReward) + (perfect ? XP.perfectBonus : 0);
}
