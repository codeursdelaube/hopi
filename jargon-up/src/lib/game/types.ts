import type { Answer } from "@/lib/exercises/schemas";

export type EarnedBadge = { slug: string; name_fr: string; icon: string | null };

export type GameSummary = {
  xpGained: number;
  totalXp: number;
  levelBefore: number;
  levelAfter: number;
  todayXp: number;
  dailyGoal: number;
  streak: number;
  streakIncreased: boolean;
  newBadges: EarnedBadge[];
};

/** Résultat renvoyé au client à la fin d'une leçon ou d'une révision. */
export type FinishResult =
  | {
      ok: true;
      summary: GameSummary;
      correct: number;
      total: number;
      /** Plafond quotidien d'XP atteint : moins (ou pas) d'XP attribués. */
      capped: boolean;
    }
  | { ok: false };

/** Réponse du premier essai pour chaque exercice. */
export type FirstTryAnswer = { exerciseId: string; answer: Answer };

export type FinishInput = { answers: FirstTryAnswer[]; offsetMinutes: number };
