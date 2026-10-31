import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { blankOut, generateLessonExercises, seededRandom, shuffle } from "./generate";
import { unitSchema } from "./schema";

describe("blankOut", () => {
  it("remplace le mot entier, sans tenir compte de la casse", () => {
    expect(blankOut("Use GET to read data.", "get")).toBe("Use ___ to read data.");
    expect(blankOut("The stand-up starts at nine.", "stand-up")).toBe("The ___ starts at nine.");
  });

  it("ne remplace pas un morceau de mot", () => {
    expect(blankOut("We merged it.", "merge")).toBeNull();
  });
});

describe("seededRandom / shuffle", () => {
  it("est reproductible", () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRandom("x"));
    const b = shuffle([1, 2, 3, 4, 5], seededRandom("x"));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

/** Valide TOUT le contenu réel : un terme mal écrit fait échouer les tests. */
describe("contenu des filières", () => {
  const contentDir = join(__dirname);
  const fields = readdirSync(contentDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const field of fields) {
    const unitsDir = join(contentDir, field.name, "units");
    const files = readdirSync(unitsDir)
      .filter((f) => f.endsWith(".json"))
      .sort();

    it(`${field.name} : termes uniques et exercices valides`, () => {
      const seen = new Set<string>();
      for (const file of files) {
        const unit = unitSchema.parse(JSON.parse(readFileSync(join(unitsDir, file), "utf8")));
        for (const lesson of unit.lessons) {
          for (const term of lesson.terms) {
            const key = term.term.toLowerCase();
            expect(seen.has(key), `terme en double : ${term.term}`).toBe(false);
            seen.add(key);
          }
          const exercises = generateLessonExercises(lesson);
          expect(exercises.length).toBeGreaterThanOrEqual(11);
          for (const d of lesson.dialogues) {
            expect(d.answerIndex).toBeLessThan(d.options.length);
          }
        }
      }
      expect(seen.size).toBeGreaterThanOrEqual(100);
    });
  }
});
