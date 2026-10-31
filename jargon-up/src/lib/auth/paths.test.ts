import { describe, expect, it } from "vitest";
import { isPrivatePath, safeNextPath } from "./paths";

describe("isPrivatePath", () => {
  it.each(["/learn", "/learn/", "/lesson/abc", "/settings", "/onboarding"])("%s est privée", (p) =>
    expect(isPrivatePath(p)).toBe(true),
  );

  it.each(["/", "/login", "/auth/callback", "/learning", "/lessons-publiques"])(
    "%s est publique",
    (p) => expect(isPrivatePath(p)).toBe(false),
  );
});

describe("safeNextPath", () => {
  it("garde un chemin interne", () => {
    expect(safeNextPath("/lesson/42?x=1")).toBe("/lesson/42?x=1");
  });

  it.each([null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "learn"])(
    "rejette %s",
    (next) => expect(safeNextPath(next)).toBe("/learn"),
  );

  it("utilise le repli fourni", () => {
    expect(safeNextPath(null, "/onboarding")).toBe("/onboarding");
  });
});
