import type { Plan } from "@/types/database";

/**
 * Droits par offre, centralisés ici pour préparer Hopi Premium.
 * Valeur `true` : ouverte à l'offre « free » ; `false` : réservée au Premium.
 * Seuls les badges Premium sont réservés pour l'instant, tout le reste est gratuit.
 */
export const FEATURES = {
  all_fields: true,
  unlimited_hearts: true,
  offline_mode: true,
  advanced_review: true,
  /** Badges difficiles (`badges.premium`), affichés avec un cadenas sur les comptes gratuits. */
  premium_badges: false,
} as const satisfies Record<string, boolean>;

export type Feature = keyof typeof FEATURES;

export function can(plan: Plan, feature: Feature): boolean {
  return plan === "premium" || FEATURES[feature];
}
