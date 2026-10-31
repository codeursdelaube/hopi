import { describe, expect, it } from "vitest";
import { buildPath, type PathUnitInput } from "./path";

const unit = (id: string, level: PathUnitInput["level"], lessonIds: string[]): PathUnitInput => ({
  id,
  level,
  title_en: id,
  title_fr: id,
  lessons: lessonIds.map((l) => ({ id: l, title_en: l, xp_reward: 10 })),
});

const UNITS = [unit("u1", "A2", ["a", "b"]), unit("u2", "B1", ["c", "d"]), unit("u3", "B2", ["e"])];

const states = (path: ReturnType<typeof buildPath>) =>
  Object.fromEntries(path.flatMap((u) => u.lessons.map((l) => [l.id, l.state])));

describe("buildPath", () => {
  it("nouvel utilisateur A2 : seule la première leçon est ouverte", () => {
    expect(states(buildPath(UNITS, new Set(), "A2"))).toEqual({
      a: "current",
      b: "locked",
      c: "locked",
      d: "locked",
      e: "locked",
    });
  });

  it("la leçon suivante s'ouvre quand la précédente est terminée", () => {
    expect(states(buildPath(UNITS, new Set(["a", "b"]), "A2"))).toMatchObject({
      a: "completed",
      b: "completed",
      c: "current",
      d: "locked",
    });
  });

  it("niveau B1 : les unités A2 sont libres et le parcours commence en B1", () => {
    const path = buildPath(UNITS, new Set(), "B1");
    expect(states(path)).toEqual({
      a: "available",
      b: "available",
      c: "current",
      d: "locked",
      e: "locked",
    });
    expect(path[0].skipped).toBe(true);
    expect(path[1].skipped).toBe(false);
  });

  it("tout terminé à son niveau : on propose les unités sautées", () => {
    expect(states(buildPath(UNITS, new Set(["c", "d", "e"]), "B1"))).toMatchObject({
      a: "current",
      b: "available",
    });
  });

  it("tout terminé : aucune leçon courante", () => {
    const path = buildPath(UNITS, new Set(["a", "b", "c", "d", "e"]), "A2");
    expect(Object.values(states(path)).every((s) => s === "completed")).toBe(true);
  });

  it("compte les leçons terminées par unité", () => {
    const path = buildPath(UNITS, new Set(["a"]), "A2");
    expect(path.map((u) => u.completedCount)).toEqual([1, 0, 0]);
  });
});
