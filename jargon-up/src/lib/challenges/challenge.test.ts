import { describe, expect, it } from "vitest";
import {
  challengeEndsAt,
  challengeWinner,
  daysLeft,
  isChallengeOver,
  rankScores,
  type ChallengeScore,
} from "./challenge";

const now = new Date("2026-11-02T10:00:00Z");

function score(userId: string, xp: number, joined = "2026-11-02T10:00:00Z"): ChallengeScore {
  return { userId, name: userId, avatarUrl: null, xp, joinedAt: new Date(joined) };
}

describe("durée du défi", () => {
  it("dure 7 jours", () => {
    expect(challengeEndsAt(now).toISOString()).toBe("2026-11-09T10:00:00.000Z");
  });

  it("jours restants arrondis au jour supérieur", () => {
    const end = challengeEndsAt(now);
    expect(daysLeft(end, now)).toBe(7);
    expect(daysLeft(end, new Date("2026-11-08T20:00:00Z"))).toBe(1);
    expect(daysLeft(end, new Date("2026-11-10T00:00:00Z"))).toBe(0);
  });

  it("terminé à l'échéance", () => {
    const end = challengeEndsAt(now);
    expect(isChallengeOver(end, now)).toBe(false);
    expect(isChallengeOver(end, end)).toBe(true);
  });
});

describe("classement", () => {
  it("trie par XP puis par date d'arrivée", () => {
    const ranked = rankScores([
      score("b", 20, "2026-11-03T00:00:00Z"),
      score("a", 50),
      score("c", 20, "2026-11-02T12:00:00Z"),
    ]);
    expect(ranked.map((s) => s.userId)).toEqual(["a", "c", "b"]);
  });

  it("gagnant unique", () => {
    expect(challengeWinner(rankScores([score("a", 10), score("b", 30)]))?.userId).toBe("b");
  });

  it("pas de gagnant en cas d'égalité ou sans XP", () => {
    expect(challengeWinner([score("a", 30), score("b", 30)])).toBeNull();
    expect(challengeWinner([score("a", 0)])).toBeNull();
    expect(challengeWinner([])).toBeNull();
  });
});
