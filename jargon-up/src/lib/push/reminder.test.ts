import { describe, expect, it } from "vitest";
import {
  MAX_INACTIVITY_PUSHES,
  buildInactivityMessage,
  buildReminder,
  firstName,
  isInactivityDue,
  isReminderDue,
} from "./reminder";

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

describe("relance après 3 jours d'absence", () => {
  const now = new Date("2026-11-10T18:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

  it("pas de relance avant 3 jours", () => {
    expect(
      isInactivityDue({ lastSeenAt: daysAgo(2), lastInactivityPushAt: null, pushCount: 0, now }),
    ).toBe(false);
  });

  it("relance au bout de 3 jours", () => {
    expect(
      isInactivityDue({ lastSeenAt: daysAgo(3), lastInactivityPushAt: null, pushCount: 0, now }),
    ).toBe(true);
  });

  it("pas deux relances en moins de 3 jours pendant la même absence", () => {
    expect(
      isInactivityDue({
        lastSeenAt: daysAgo(5),
        lastInactivityPushAt: daysAgo(2),
        pushCount: 1,
        now,
      }),
    ).toBe(false);
  });

  it("nouvelle relance 3 jours après la précédente", () => {
    expect(
      isInactivityDue({
        lastSeenAt: daysAgo(6),
        lastInactivityPushAt: daysAgo(3),
        pushCount: 1,
        now,
      }),
    ).toBe(true);
  });

  it("une relance d'une absence passée n'empêche pas la nouvelle", () => {
    expect(
      isInactivityDue({
        lastSeenAt: daysAgo(3),
        lastInactivityPushAt: daysAgo(10),
        pushCount: 0,
        now,
      }),
    ).toBe(true);
  });

  it(`arrêt après ${MAX_INACTIVITY_PUSHES} relances`, () => {
    expect(
      isInactivityDue({
        lastSeenAt: daysAgo(30),
        lastInactivityPushAt: daysAgo(4),
        pushCount: MAX_INACTIVITY_PUSHES,
        now,
      }),
    ).toBe(false);
  });

  it("le message change d'une relance à l'autre", () => {
    const ctx = { name: "Koffi", daysAway: 3, dueReviews: 4 };
    const titles = new Set(
      Array.from({ length: MAX_INACTIVITY_PUSHES }, (_, i) => buildInactivityMessage(i, ctx).title),
    );
    expect(titles.size).toBe(MAX_INACTIVITY_PUSHES);
    expect(buildInactivityMessage(0, ctx).title).toBe("Ça fait 3 jours, Koffi !");
    expect(buildInactivityMessage(0, ctx).body).toContain("4 mots");
  });

  it("prénom seulement", () => {
    expect(firstName("Eric Adokou")).toBe("Eric");
    expect(firstName(null)).toBeNull();
    expect(firstName("   ")).toBeNull();
  });
});
