/**
 * Défis entre amis : « qui gagne le plus d'XP en 7 jours ? ».
 * Fonctions pures (testées) ; les lectures et écritures sont dans load.ts et app/defi/actions.ts.
 */

/** Durée d'un défi. */
export const CHALLENGE_DAYS = 7;
/** Défis en cours qu'un utilisateur peut avoir lancés en même temps (anti-abus). */
export const MAX_ACTIVE_CHALLENGES = 5;
/** Participants maximum par défi (créateur compris). */
export const MAX_PARTICIPANTS = 20;

const DAY = 86_400_000;

export function challengeEndsAt(now: Date): Date {
  return new Date(now.getTime() + CHALLENGE_DAYS * DAY);
}

export function isChallengeOver(endsAt: Date, now: Date): boolean {
  return now.getTime() >= endsAt.getTime();
}

/** Jours restants, arrondis au jour supérieur (0 si le défi est terminé). */
export function daysLeft(endsAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY));
}

export type ChallengeScore = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  xp: number;
  joinedAt: Date;
};

/** Classement : plus d'XP d'abord ; à égalité, celui qui a rejoint le premier. */
export function rankScores(scores: ChallengeScore[]): ChallengeScore[] {
  return [...scores].sort((a, b) => b.xp - a.xp || a.joinedAt.getTime() - b.joinedAt.getTime());
}

/** Gagnant d'un défi terminé : null si personne n'a gagné d'XP ou s'il y a égalité en tête. */
export function challengeWinner(ranked: ChallengeScore[]): ChallengeScore | null {
  const [first, second] = ranked;
  if (!first || first.xp === 0) return null;
  if (second && second.xp === first.xp) return null;
  return first;
}
