import { describe, expect, it } from "vitest";
import { INITIAL_REVIEW_STATE, nextReviewAt, qualityFromResult, sm2 } from "./sm2";

describe("SM-2", () => {
  it("intervalles 1 jour, puis 6 jours, puis × facilité", () => {
    const s1 = sm2(INITIAL_REVIEW_STATE, 4);
    expect(s1).toMatchObject({ intervalDays: 1, repetitions: 1 });
    const s2 = sm2(s1, 4);
    expect(s2).toMatchObject({ intervalDays: 6, repetitions: 2 });
    const s3 = sm2(s2, 4);
    expect(s3.intervalDays).toBe(Math.round(6 * s2.easeFactor));
  });

  it("une réponse parfaite augmente la facilité, une moyenne la garde", () => {
    expect(sm2(INITIAL_REVIEW_STATE, 5).easeFactor).toBe(2.6);
    expect(sm2(INITIAL_REVIEW_STATE, 4).easeFactor).toBe(2.5);
  });

  it("un échec remet à zéro et ramène la carte demain", () => {
    const learned = { easeFactor: 2.5, intervalDays: 15, repetitions: 3 };
    expect(sm2(learned, 2)).toEqual({ easeFactor: 2.3, intervalDays: 1, repetitions: 0 });
  });

  it("la facilité ne descend jamais sous 1.3", () => {
    let s = INITIAL_REVIEW_STATE;
    for (let i = 0; i < 20; i++) s = sm2(s, 0);
    expect(s.easeFactor).toBe(1.3);
  });

  it("date de prochaine révision", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    expect(nextReviewAt(now, 6).toISOString()).toBe("2026-01-07T10:00:00.000Z");
  });

  it("qualité déduite du résultat", () => {
    expect(qualityFromResult(true)).toBe(4);
    expect(qualityFromResult(false)).toBe(2);
  });
});
