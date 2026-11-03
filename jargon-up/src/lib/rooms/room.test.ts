import { describe, expect, it } from "vitest";
import { seededRandom } from "@/lib/random";
import {
  ROOM,
  buildPuzzle,
  formatDuration,
  formatLimit,
  isOpenDuration,
  isRoomOpen,
  minutesLeft,
  rankOf,
  isTimeLimit,
  timedScore,
  gradePlacements,
  publicPuzzle,
  rankResults,
  roomXp,
  type LessonTerms,
  type RoomResult,
} from "./room";

const lesson = (id: string, n = 8): LessonTerms => ({
  id,
  title: `Lesson ${id}`,
  terms: Array.from({ length: n }, (_, i) => ({ id: `${id}-t${i}`, term: `${id} term ${i}` })),
});

describe("buildPuzzle", () => {
  const lessons = ["a", "b", "c", "d", "e", "f"].map((id) => lesson(id));

  it("4 concepts, 3 termes chacun, tous rattachés à leur leçon", () => {
    const puzzle = buildPuzzle(lessons, seededRandom("x"))!;
    expect(puzzle.concepts).toHaveLength(ROOM.concepts);
    expect(puzzle.terms).toHaveLength(ROOM.concepts * ROOM.termsPerConcept);
    for (const concept of puzzle.concepts) {
      const terms = puzzle.terms.filter((t) => t.conceptId === concept.id);
      expect(terms).toHaveLength(ROOM.termsPerConcept);
      expect(terms.every((t) => t.id.startsWith(`${concept.id}-`))).toBe(true);
    }
  });

  it("termes mélangés (pas regroupés par concept)", () => {
    const puzzle = buildPuzzle(lessons, seededRandom("mix"))!;
    const groups = puzzle.terms.map((t) => t.conceptId);
    const sorted = [...groups].sort();
    expect(groups).not.toEqual(sorted);
  });

  it("ignore les leçons trop petites, null s'il n'y a pas assez de contenu", () => {
    expect(buildPuzzle([lesson("a"), lesson("b"), lesson("c"), lesson("d", 2)])).toBeNull();
    expect(buildPuzzle([lesson("a"), lesson("b"), lesson("c"), lesson("d", 3)])).not.toBeNull();
  });

  it("la version envoyée au navigateur ne contient pas la solution", () => {
    const puzzle = buildPuzzle(lessons, seededRandom("y"))!;
    const pub = publicPuzzle(puzzle);
    expect(JSON.stringify(pub.terms)).not.toContain("conceptId");
    expect(pub.terms.map((t) => t.id)).toEqual(puzzle.terms.map((t) => t.id));
  });
});

describe("correction et XP", () => {
  const puzzle = buildPuzzle(
    ["a", "b", "c", "d"].map((id) => lesson(id)),
    seededRandom("z"),
  )!;
  const solution = Object.fromEntries(puzzle.terms.map((t) => [t.id, t.conceptId]));

  it("tout juste : 12/12 et bonus", () => {
    expect(gradePlacements(puzzle, solution)).toEqual({ correct: 12, total: 12 });
    expect(roomXp(12, 12)).toBe(29);
  });

  it("une erreur et un terme non rangé", () => {
    const [first, second] = puzzle.terms;
    const wrongConcept = puzzle.concepts.find((c) => c.id !== first.conceptId)!.id;
    const placements = { ...solution, [first.id]: wrongConcept };
    delete placements[second.id];
    expect(gradePlacements(puzzle, placements)).toEqual({ correct: 10, total: 12 });
    expect(roomXp(10, 12)).toBe(20);
  });

  it("un concept inventé ne compte pas", () => {
    const placements = Object.fromEntries(puzzle.terms.map((t) => [t.id, "inconnu"]));
    expect(gradePlacements(puzzle, placements).correct).toBe(0);
    expect(roomXp(0, 12)).toBe(0);
  });
});

describe("classement", () => {
  const r = (userId: string, correct: number, durationMs: number): RoomResult => ({
    userId,
    name: userId,
    avatarUrl: null,
    correct,
    total: 12,
    durationMs,
    xp: 0,
  });

  it("plus de bonnes réponses d'abord, puis le plus rapide", () => {
    const ranked = rankResults([
      r("lent", 12, 90_000),
      r("rapide", 12, 40_000),
      r("faux", 9, 10_000),
    ]);
    expect(ranked.map((x) => x.userId)).toEqual(["rapide", "lent", "faux"]);
  });

  it("minutes restantes (arrondi supérieur, au moins 1) et salle ouverte", () => {
    const now = new Date("2026-11-03T10:00:00Z");
    expect(minutesLeft(new Date("2026-11-03T10:15:00Z"), now)).toBe(15);
    expect(minutesLeft(new Date("2026-11-03T10:00:20Z"), now)).toBe(1);
    expect(minutesLeft(new Date("2026-11-06T10:00:00Z"), now)).toBe(4320);
    expect(isRoomOpen(new Date("2026-11-03T10:00:01Z"), now)).toBe(true);
    expect(isRoomOpen(now, now)).toBe(false);
  });

  it("rang d'un joueur dans le classement", () => {
    const ranked = rankResults([r("a", 12, 50_000), r("b", 12, 30_000), r("c", 5, 20_000)]);
    expect(rankOf(ranked, "b")).toBe(1);
    expect(rankOf(ranked, "c")).toBe(3);
    expect(rankOf(ranked, "z")).toBeNull();
  });

  it("durées d'ouverture proposées à l'hôte", () => {
    expect(isOpenDuration(15)).toBe(true);
    expect(isOpenDuration(4320)).toBe(true);
    expect(isOpenDuration(7)).toBe(false);
  });

  it("durée lisible", () => {
    expect(formatDuration(42_400)).toBe("42 s");
    expect(formatDuration(65_000)).toBe("1 min 05 s");
  });
});

describe("temps limite", () => {
  it("format court du temps limite", () => {
    expect(formatLimit(60)).toBe("1 min");
    expect(formatLimit(90)).toBe("1 min 30");
    expect(formatLimit(45)).toBe("45 s");
  });

  it("seules les durées proposées sont acceptées", () => {
    expect(isTimeLimit(90)).toBe(true);
    expect(isTimeLimit(5)).toBe(false);
    expect(isTimeLimit(3600)).toBe(false);
  });

  it("dans le temps : score gardé", () => {
    expect(timedScore({ correct: 10, elapsedMs: 45_000, limitMs: 60_000 })).toEqual({
      correct: 10,
      durationMs: 45_000,
      late: false,
    });
  });

  it("envoi automatique à zéro, un peu retardé par le réseau : accepté, durée plafonnée", () => {
    expect(timedScore({ correct: 8, elapsedMs: 63_000, limitMs: 60_000 })).toEqual({
      correct: 8,
      durationMs: 60_000,
      late: false,
    });
  });

  it("bien trop tard (chronomètre bloqué, page fermée) : partie perdue", () => {
    expect(timedScore({ correct: 12, elapsedMs: 75_000, limitMs: 60_000 })).toEqual({
      correct: 0,
      durationMs: 60_000,
      late: true,
    });
  });
});
