import "server-only";
import { cookies } from "next/headers";
import { clampOffset } from "@/lib/gamification/dates";

/** Nom du cookie où le navigateur enregistre son décalage horaire (voir TimezoneCookie). */
export const TZ_COOKIE = "tz";

/** Décalage horaire de l'utilisateur (minutes, comme `getTimezoneOffset`) ; 0 par défaut (Togo). */
export async function getUserOffset(): Promise<number> {
  const value = (await cookies()).get(TZ_COOKIE)?.value;
  return value === undefined ? 0 : clampOffset(Number(value));
}
