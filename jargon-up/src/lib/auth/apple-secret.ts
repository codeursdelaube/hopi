/**
 * « Secret Key (for OAuth) » de la connexion Apple dans Supabase.
 *
 * Apple ne fournit pas ce secret tel quel : c'est un JWT signé (ES256) avec la clé privée
 * « Sign in with Apple » (fichier .p8), valable 6 mois au plus. Il faut donc le régénérer
 * régulièrement : `npm run apple:secret` (voir scripts/apple-client-secret.ts).
 * Utilisé uniquement en ligne de commande (jamais par l'appli ni le navigateur).
 */
import { createPrivateKey, sign } from "node:crypto";

/** Durée maximale acceptée par Apple : 6 mois (15 777 000 s) ; on garde une marge. */
export const APPLE_SECRET_MAX_DAYS = 180;

/** Team ID et Key ID Apple : 10 caractères (lettres majuscules et chiffres). */
const APPLE_ID_PATTERN = /^[A-Z0-9]{10}$/;

export type AppleSecretInput = {
  /** Team ID (Apple Developer → Membership). */
  teamId: string;
  /** Key ID de la clé « Sign in with Apple ». */
  keyId: string;
  /** Identifiant du Services ID (ex. app.hopigame.web), à mettre aussi dans « Client IDs ». */
  servicesId: string;
  /** Contenu du fichier AuthKey_XXXXXXXXXX.p8. */
  privateKeyPem: string;
  now?: Date;
  days?: number;
};

const base64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

export function appleClientSecret(input: AppleSecretInput): { secret: string; expiresAt: Date } {
  const { teamId, keyId, servicesId, privateKeyPem } = input;
  const days = input.days ?? APPLE_SECRET_MAX_DAYS;
  if (!APPLE_ID_PATTERN.test(teamId)) throw new Error("Team ID invalide (10 caractères A-Z/0-9).");
  if (!APPLE_ID_PATTERN.test(keyId)) throw new Error("Key ID invalide (10 caractères A-Z/0-9).");
  if (!servicesId.trim()) throw new Error("Services ID manquant.");
  if (!Number.isInteger(days) || days < 1 || days > APPLE_SECRET_MAX_DAYS) {
    throw new Error(`Durée invalide : entre 1 et ${APPLE_SECRET_MAX_DAYS} jours.`);
  }

  const iat = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const exp = iat + days * 86_400;
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = base64url(
    JSON.stringify({ iss: teamId, iat, exp, aud: "https://appleid.apple.com", sub: servicesId }),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(privateKeyPem),
    // Format JWT (r || s), et non DER.
    dsaEncoding: "ieee-p1363",
  });
  return {
    secret: `${header}.${payload}.${base64url(signature)}`,
    expiresAt: new Date(exp * 1000),
  };
}
