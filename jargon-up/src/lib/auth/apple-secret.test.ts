import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { APPLE_SECRET_MAX_DAYS, appleClientSecret } from "./apple-secret";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const base = {
  teamId: "ABCDE12345",
  keyId: "KEY1234567",
  servicesId: "app.hopigame.web",
  privateKeyPem: pem,
};

const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString());

describe("appleClientSecret", () => {
  it("JWT ES256 signé, avec les champs attendus par Apple", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    const { secret, expiresAt } = appleClientSecret({ ...base, now });
    const [header, payload, signature] = secret.split(".");

    expect(decode(header)).toEqual({ alg: "ES256", kid: "KEY1234567" });
    const claims = decode(payload);
    expect(claims).toMatchObject({
      iss: "ABCDE12345",
      sub: "app.hopigame.web",
      aud: "https://appleid.apple.com",
    });
    expect(claims.exp - claims.iat).toBe(APPLE_SECRET_MAX_DAYS * 86_400);
    expect(expiresAt.toISOString()).toBe("2027-05-03T10:00:00.000Z");

    const valid = verify(
      "sha256",
      Buffer.from(`${header}.${payload}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url"),
    );
    expect(valid).toBe(true);
  });

  it("refuse une durée au-delà de 6 mois et des identifiants mal formés", () => {
    expect(() => appleClientSecret({ ...base, days: 200 })).toThrow(/Durée/);
    expect(() => appleClientSecret({ ...base, teamId: "abc" })).toThrow(/Team ID/);
    expect(() => appleClientSecret({ ...base, keyId: "" })).toThrow(/Key ID/);
    expect(() => appleClientSecret({ ...base, servicesId: " " })).toThrow(/Services ID/);
  });
});
