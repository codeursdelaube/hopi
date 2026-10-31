import { describe, expect, it } from "vitest";
import { levelFromXp, levelProgress, xpForLevel } from "./levels";
import { clampOffset, daysBetween, localDate, localDayStart } from "./dates";
import { effectiveStreak, registerGoalReached } from "./streak";
import { lessonXp, scorePercent } from "./xp";

describe("niveaux", () => {
  it("seuils croissants", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 50, 150, 300, 500]);
  });

  it.each([
    [0, 1],
    [49, 1],
    [50, 2],
    [149, 2],
    [150, 3],
    [10_000, 20],
    [-5, 1],
  ])("%i XP → niveau %i", (xp, level) => {
    expect(levelFromXp(xp)).toBe(level);
  });

  it("progression dans le niveau", () => {
    expect(levelProgress(75)).toEqual({ level: 2, current: 25, needed: 100, ratio: 0.25 });
  });
});

describe("dates locales", () => {
  const now = new Date("2026-03-10T23:30:00Z");

  it("Togo (UTC+0)", () => {
    expect(localDate(now, 0)).toBe("2026-03-10");
  });

  it("Paris en été (UTC+2 → offset −120) passe au lendemain", () => {
    expect(localDate(now, -120)).toBe("2026-03-11");
    expect(localDayStart(now, -120).toISOString()).toBe("2026-03-10T22:00:00.000Z");
  });

  it("New York (UTC−5 → offset 300)", () => {
    expect(localDate(now, 300)).toBe("2026-03-10");
    expect(localDayStart(now, 300).toISOString()).toBe("2026-03-10T05:00:00.000Z");
  });

  it("borne les décalages absurdes", () => {
    expect(clampOffset(99999)).toBe(720);
    expect(clampOffset(Number.NaN)).toBe(0);
  });

  it("écart en jours, y compris en changeant de mois", () => {
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
    expect(daysBetween("2026-03-01", "2026-03-01")).toBe(0);
  });
});

describe("série (streak)", () => {
  const base = { currentStreak: 4, longestStreak: 6, lastActivityDate: "2026-03-09" };

  it("continue si l'objectif était atteint hier", () => {
    expect(registerGoalReached(base, "2026-03-10")).toEqual({
      currentStreak: 5,
      longestStreak: 6,
      lastActivityDate: "2026-03-10",
      increased: true,
    });
  });

  it("ne compte qu'une fois par jour", () => {
    const today = { ...base, lastActivityDate: "2026-03-10" };
    expect(registerGoalReached(today, "2026-03-10")).toMatchObject({
      currentStreak: 4,
      increased: false,
    });
  });

  it("repart à 1 après un jour manqué", () => {
    expect(registerGoalReached(base, "2026-03-12")).toMatchObject({
      currentStreak: 1,
      increased: true,
    });
  });

  it("première fois", () => {
    const fresh = { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    expect(registerGoalReached(fresh, "2026-03-10")).toMatchObject({
      currentStreak: 1,
      longestStreak: 1,
    });
  });

  it("met à jour le record", () => {
    const s = { currentStreak: 6, longestStreak: 6, lastActivityDate: "2026-03-09" };
    expect(registerGoalReached(s, "2026-03-10").longestStreak).toBe(7);
  });

  it("affichage : la série tombe à 0 après un jour sans objectif", () => {
    expect(effectiveStreak(base, "2026-03-10")).toBe(4);
    expect(effectiveStreak(base, "2026-03-11")).toBe(0);
    expect(effectiveStreak({ ...base, lastActivityDate: null }, "2026-03-10")).toBe(0);
  });
});

describe("XP", () => {
  it("bonus de précision à 100 %", () => {
    expect(lessonXp(10, 12, 12)).toBe(15);
    expect(lessonXp(10, 11, 12)).toBe(10);
  });

  it("pourcentage", () => {
    expect(scorePercent(9, 12)).toBe(75);
    expect(scorePercent(0, 0)).toBe(0);
  });
});
