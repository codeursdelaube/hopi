import { daysBetween } from "./dates";

export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  /** Dernier jour (local) où l'objectif quotidien a été atteint. */
  lastActivityDate: string | null;
};

/**
 * Série affichée aujourd'hui : elle tombe à 0 si l'objectif n'a été atteint ni hier ni aujourd'hui.
 */
export function effectiveStreak(state: StreakState, today: string): number {
  if (!state.lastActivityDate) return 0;
  return daysBetween(state.lastActivityDate, today) <= 1 ? state.currentStreak : 0;
}

/**
 * Met à jour la série quand l'objectif du jour vient d'être atteint.
 * - déjà compté aujourd'hui → rien ne change ;
 * - dernier jour = hier → +1 ;
 * - sinon (jour manqué ou première fois) → la série repart à 1.
 */
export function registerGoalReached(
  state: StreakState,
  today: string,
): StreakState & { increased: boolean } {
  if (state.lastActivityDate === today) return { ...state, increased: false };

  const continues =
    state.lastActivityDate !== null && daysBetween(state.lastActivityDate, today) === 1;
  const currentStreak = continues ? state.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastActivityDate: today,
    increased: true,
  };
}
