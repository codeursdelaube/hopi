import type { Plan } from "@/types/database";

/**
 * Droits par offre, centralisés ici pour préparer Hopi Premium.
 * Aujourd'hui TOUT est gratuit : chaque fonctionnalité est ouverte à l'offre « free ».
 * Pour réserver une fonctionnalité au Premium plus tard, passer sa valeur à `false`.
 */
export const FEATURES = {
  all_fields: true,
  unlimited_hearts: true,
  offline_mode: true,
  advanced_review: true,
} as const satisfies Record<string, boolean>;

export type Feature = keyof typeof FEATURES;

export function can(plan: Plan, feature: Feature): boolean {
  return plan === "premium" || FEATURES[feature];
}
