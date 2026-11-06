/**
 * Salles « Tri express » : 12 termes anglais mélangés à ranger dans leur concept (4 thèmes de
 * leçon). Fonctions pures (testées) ; lectures et écritures dans load.ts et app/salle/actions.ts.
 */
import { z } from "zod";
import { shuffle } from "@/lib/random";

export const ROOM = {
  concepts: 4,
  termsPerConcept: 3,
  /** Temps d'attente des joueurs que l'hôte peut choisir (minutes) : 15 min, 1 h, 24 h, 3 jours. */
  openDurations: [15, 60, 1440, 4320],
  defaultOpenDuration: 60,
  /** Salles d'attente en même temps par créateur (anti-abus). */
  maxActive: 5,
  maxPlayers: 30,
  /** Temps limites que l'hôte peut choisir (secondes). */
  timeLimits: [60, 90, 120, 180],
  defaultTimeLimit: 90,
  /** Marge pour la latence réseau avant de refuser une réponse arrivée trop tard. */
  lateGraceMs: 10_000,
  /** Joueurs nécessaires pour lancer une partie (hôte compris). */
  minPlayers: 2,
  /** Compte à rebours après le lancement : tous les téléphones ont le temps de le recevoir. */
  countdownSeconds: 5,
  /** Mise à jour de l'écran : salle d'attente, puis résultats des autres joueurs. */
  lobbyRefreshMs: 3000,
  resultsRefreshMs: 5000,
} as const;

export type TimeLimit = (typeof ROOM.timeLimits)[number];
export type OpenDuration = (typeof ROOM.openDurations)[number];

export function isOpenDuration(value: number): value is OpenDuration {
  return (ROOM.openDurations as readonly number[]).includes(value);
}

export function isTimeLimit(value: number): value is TimeLimit {
  return (ROOM.timeLimits as readonly number[]).includes(value);
}

/** Barème : 2 XP par terme bien classé, +5 si tout est juste. Plafond quotidien anti-abus. */
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

/** Correction : un terme est juste s'il est classé dans son concept. Un terme non classé est faux. */
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

/** Minutes restantes avant la fermeture, arrondies à la minute supérieure (au moins 1). */
export function minutesLeft(endsAt: Date, now: Date): number {
  return Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 60_000));
}

export function isRoomOpen(endsAt: Date, now: Date): boolean {
  return now.getTime() < endsAt.getTime();
}

/** On ne rejoint qu'une salle d'attente encore ouverte (pas une partie déjà lancée). */
export function isRoomJoinable(startedAt: Date | null, endsAt: Date, now: Date): boolean {
  return startedAt === null && isRoomOpen(endsAt, now);
}

export type LobbyPlayer = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  ready: boolean;
};

/** L'hôte peut lancer dès qu'au moins un autre joueur est prêt. */
export function lobbyStatus(players: readonly LobbyPlayer[], hostId: string) {
  const others = players.filter((p) => p.userId !== hostId);
  const readyOthers = others.filter((p) => p.ready).length;
  // Joueurs qui participeront si l'hôte lance maintenant (lui compris).
  const participants = readyOthers + 1;
  return {
    others: others.length,
    readyOthers,
    participants,
    canLaunch: participants >= ROOM.minPlayers,
  };
}

/** Des joueurs peuvent-ils encore envoyer leur score ? (sinon, inutile de rafraîchir) */
export function isGameRunning(startedAt: Date, timeLimitSeconds: number, now: Date): boolean {
  return now.getTime() < startedAt.getTime() + timeLimitSeconds * 1000 + ROOM.lateGraceMs;
}

/** Rang (1 = premier) d'un joueur dans un classement déjà trié, ou null s'il n'y figure pas. */
export function rankOf(ranked: readonly RoomResult[], userId: string): number | null {
  const index = ranked.findIndex((r) => r.userId === userId);
  return index === -1 ? null : index + 1;
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
