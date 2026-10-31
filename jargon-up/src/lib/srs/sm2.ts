/**
 * Algorithme de répétition espacée SM-2 (SuperMemo 2).
 * Qualité de la réponse : 0 (oubli total) à 5 (parfait). En dessous de 3, on recommence.
 */
export type ReviewState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export const INITIAL_REVIEW_STATE: ReviewState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
};

const MIN_EASE = 1.3;

export function sm2(state: ReviewState, quality: number): ReviewState {
  const q = Math.min(5, Math.max(0, Math.round(quality)));

  if (q < 3) {
    // Raté : la carte revient vite (demain), la facilité baisse un peu.
    return {
      easeFactor: Math.max(MIN_EASE, state.easeFactor - 0.2),
      intervalDays: 1,
      repetitions: 0,
    };
  }

  const repetitions = state.repetitions + 1;
  const intervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 6
        : Math.round(state.intervalDays * state.easeFactor);
  const easeFactor = Math.max(
    MIN_EASE,
    state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );
  return { easeFactor: Math.round(easeFactor * 100) / 100, intervalDays, repetitions };
}

/** Prochaine date de révision. */
export function nextReviewAt(now: Date, intervalDays: number): Date {
  return new Date(now.getTime() + intervalDays * 86_400_000);
}

/** Qualité déduite d'une réponse juste/fausse (pas d'auto-évaluation dans l'appli). */
export function qualityFromResult(correct: boolean): number {
  return correct ? 4 : 2;
}
