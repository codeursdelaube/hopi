import { describe, expect, it } from "vitest";
import { FEATURES, can, type Feature } from "./features";

describe("can", () => {
  const features = Object.keys(FEATURES) as Feature[];

  it("tout est gratuit sauf les badges Premium", () => {
    for (const f of features) expect(can("free", f)).toBe(f !== "premium_badges");
  });

  it("le Premium a toujours tout", () => {
    for (const f of features) expect(can("premium", f)).toBe(true);
  });
});
