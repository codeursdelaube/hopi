import { describe, expect, it } from "vitest";
import { buildReminder } from "./reminder";

const base = {
  notifyWord: true,
  notifyReviews: true,
  word: "deploy",
  wordClaimed: false,
  dueReviews: 0,
};

describe("buildReminder", () => {
  it("mot du jour seul", () => {
    expect(buildReminder(base)).toMatchObject({
      title: "Mot du jour : deploy",
      url: "/word-of-the-day",
    });
  });

  it("révisions seules quand le mot est déjà validé", () => {
    const msg = buildReminder({ ...base, wordClaimed: true, dueReviews: 5 });
    expect(msg).toMatchObject({ url: "/review" });
    expect(msg?.body).toContain("5 mots");
  });

  it("combine les deux", () => {
    const msg = buildReminder({ ...base, dueReviews: 1 });
    expect(msg?.title).toBe("Mot du jour : deploy");
    expect(msg?.body).toContain("1 mot t'attend");
  });

  it("respecte les préférences", () => {
    expect(buildReminder({ ...base, notifyWord: false })).toBeNull();
    expect(
      buildReminder({ ...base, notifyWord: false, notifyReviews: false, dueReviews: 3 }),
    ).toBeNull();
  });

  it("rien à dire → pas de notification", () => {
    expect(buildReminder({ ...base, wordClaimed: true })).toBeNull();
    expect(buildReminder({ ...base, word: null })).toBeNull();
  });
});
