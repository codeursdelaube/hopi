/**
 * Salles « Tri express » : 12 termes anglais mélangés à ranger dans leur concept (4 thèmes de
 * leçon). Fonctions pures (testées) ; lectures et écritures dans load.ts et app/salle/actions.ts.
 */
import { z } from "zod";
import { shuffle } from "@/lib/random";

export const ROOM = {
  concepts: 4,
  termsPerConcept: 3,
  /** Durée d'ouverture d'une salle. */
  hours: 72,
  /** Salles ouvertes en même temps par créateur (anti-abus). */
  maxActive: 5,
  maxPlayers: 30,
  /** Temps limites que l'hôte peut choisir (secondes). */
  timeLimits: [60, 90, 120, 180],
  defaultTimeLimit: 90,
  /** Marge pour la latence réseau avant de refuser une réponse arrivée trop tard. */
  lateGraceMs: 10_000,
} as const;

export type TimeLimit = (typeof ROOM.timeLimits)[number];

export function isTimeLimit(value: number): value is TimeLimit {
  return (ROOM.timeLimits as readonly number[]).includes(value);
}

/** Barème : 2 XP par terme bien rangé, +5 si tout est juste. Plafond quotidien anti-abus. */
export const ROOM_XP = { perCorrect: 2, perfectBonus: 5, dailyCap: 60 } as const;

export const puzzleSchema = z.object({
  concepts: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
  terms: z.array(z.object({ id: z.string(), term: z.string(), conceptId: z.string() })).min(2),
});

export type Puzzle = z.infer<typeof puzzleSchema>;

/** Ce que reçoit le navigateur : les termes et les concepts, sans la solution. */
export type PublicPuzzle = {
  concepts: Puzzle["concepts"];
  terms: { id: string; term: string }[];
};

export function publicPuzzle(puzzle: Puzzle): PublicPuzzle {
  return {
    concepts: puzzle.concepts,
    terms: puzzle.terms.map(({ id, term }) => ({ id, term })),
  };
}

export type LessonTerms = { id: string; title: string; terms: { id: string; term: string }[] };

/**
 * Tire 4 leçons (concepts) et 3 termes dans chacune, puis mélange les termes.
 * Renvoie null si la filière n'a pas assez de contenu.
 */
export function buildPuzzle(
  lessons: LessonTerms[],
  random: () => number = Math.random,
): Puzzle | null {
  const eligible = lessons.filter((l) => l.terms.length >= ROOM.termsPerConcept);
  if (eligible.length < ROOM.concepts) return null;
  const picked = shuffle(eligible, random).slice(0, ROOM.concepts);
  const terms = picked.flatMap((lesson) =>
    shuffle(lesson.terms, random)
      .slice(0, ROOM.termsPerConcept)
      .map((t) => ({ id: t.id, term: t.term, conceptId: lesson.id })),
  );
  return {
    concepts: picked.map((l) => ({ id: l.id, label: l.title })),
    terms: shuffle(terms, random),
  };
}

/** Correction : un terme est juste s'il est rangé dans son concept. Un terme non rangé est faux. */
export function gradePlacements(
  puzzle: Puzzle,
  placements: Readonly<Record<string, string>>,
): { correct: number; total: number } {
  const correct = puzzle.terms.filter((t) => placements[t.id] === t.conceptId).length;
  return { correct, total: puzzle.terms.length };
}

export function roomXp(correct: number, total: number): number {
  return correct * ROOM_XP.perCorrect + (total > 0 && correct === total ? ROOM_XP.perfectBonus : 0);
}

/**
 * Chronométrage côté serveur. Dans le temps (plus la marge réseau) : score retenu, durée
 * plafonnée au temps limite. Trop tard : partie perdue (0 bonne réponse), durée = temps limite.
 */
export function timedScore(input: { correct: number; elapsedMs: number; limitMs: number }): {
  correct: number;
  durationMs: number;
  late: boolean;
} {
  const late = input.elapsedMs > input.limitMs + ROOM.lateGraceMs;
  return {
    correct: late ? 0 : input.correct,
    durationMs: Math.max(0, Math.min(input.elapsedMs, input.limitMs)),
    late,
  };
}

export type RoomResult = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  correct: number;
  total: number;
  durationMs: number;
  xp: number;
};

/** Classement : plus de bonnes réponses d'abord, puis le plus rapide. */
export function rankResults(results: RoomResult[]): RoomResult[] {
  return [...results].sort((a, b) => b.correct - a.correct || a.durationMs - b.durationMs);
}

/** Heures restantes avant la fermeture, arrondies à l'heure supérieure (au moins 1). */
export function hoursLeft(endsAt: Date, now: Date): number {
  return Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 3_600_000));
}

/** Temps limite en format court : « 1 min », « 1 min 30 », « 45 s ». */
export function formatLimit(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const r = seconds % 60;
  if (m === 0) return `${r} s`;
  return r === 0 ? `${m} min` : `${m} min ${String(r).padStart(2, "0")}`;
}

/** « 42 s » ou « 1 min 05 s ». */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`;
}
