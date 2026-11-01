import { describe, expect, it } from "vitest";
import { buildReminder, isReminderDue } from "./reminder";

describe("isReminderDue", () => {
  const at = (iso: string) => new Date(iso);

  it("Togo (UTC+0) : 18 h choisi, il est 18 h 00 UTC", () => {
    expect(
      isReminderDue({
        reminderHours: [18],
        offsetMinutes: 0,
        now: at("2026-11-02T18:00:30Z"),
        lastReminderAt: null,
      }),
    ).toBe(true);
  });

  it("pas la bonne heure", () => {
    expect(
      isReminderDue({
        reminderHours: [7, 21],
        offsetMinutes: 0,
        now: at("2026-11-02T18:00:00Z"),
        lastReminderAt: null,
      }),
    ).toBe(false);
  });

  it("tient compte du fuseau : Paris en hiver (UTC+1 → offset −60), 19 h locale = 18 h UTC", () => {
    expect(
      isReminderDue({
        reminderHours: [19],
        offsetMinutes: -60,
        now: at("2026-11-02T18:00:00Z"),
        lastReminderAt: null,
      }),
    ).toBe(true);
  });

  it("pas de doublon dans la même heure", () => {
    expect(
      isReminderDue({
        reminderHours: [18],
        offsetMinutes: 0,
        now: at("2026-11-02T18:40:00Z"),
        lastReminderAt: at("2026-11-02T18:00:05Z"),
      }),
    ).toBe(false);
  });

  it("le rappel de la veille n'empêche pas celui du jour", () => {
    expect(
      isReminderDue({
        reminderHours: [18],
        offsetMinutes: 0,
        now: at("2026-11-02T18:00:00Z"),
        lastReminderAt: at("2026-11-01T18:00:00Z"),
      }),
    ).toBe(true);
  });
});

describe("buildReminder", () => {
  const base = {
    notifyWord: true,
    notifyReviews: true,
    word: "deploy",
    wordClaimed: false,
    dueReviews: 0,
    learnedWords: 10,
  };

  it("mots à réviser + mot du jour → révision", () => {
    const msg = buildReminder({ ...base, dueReviews: 5 });
    expect(msg).toMatchObject({ title: "C'est l'heure de réviser !", url: "/review" });
    expect(msg?.body).toContain("5 mots");
    expect(msg?.body).toContain("deploy");
  });

  it("rien à réviser → mot du jour + entraînement", () => {
    expect(buildReminder(base)).toMatchObject({
      title: "Mot du jour : deploy",
      url: "/word-of-the-day",
    });
  });

  it("rien à réviser et mot déjà validé → entraînement libre", () => {
    expect(buildReminder({ ...base, wordClaimed: true })).toMatchObject({
      title: "C'est l'heure de ta révision !",
      url: "/review",
    });
  });

  it("aucun mot appris → première leçon", () => {
    expect(buildReminder({ ...base, learnedWords: 0 })).toMatchObject({ url: "/learn" });
  });

  it("seulement le mot du jour", () => {
    expect(buildReminder({ ...base, notifyReviews: false, dueReviews: 3 })).toMatchObject({
      url: "/word-of-the-day",
    });
  });

  it("tout coupé → rien", () => {
    expect(buildReminder({ ...base, notifyWord: false, notifyReviews: false })).toBeNull();
    expect(buildReminder({ ...base, notifyReviews: false, wordClaimed: true })).toBeNull();
  });
});
