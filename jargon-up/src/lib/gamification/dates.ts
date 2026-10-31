/**
 * Dates « locales » de l'utilisateur.
 *
 * Choix documenté : la série et l'objectif du jour suivent le jour LOCAL de l'utilisateur.
 * Le navigateur envoie son décalage horaire (`new Date().getTimezoneOffset()`, en minutes,
 * positif à l'ouest de UTC) ; le serveur en déduit la date locale. Au Togo (UTC+0), jour local = jour UTC.
 * `profiles.last_activity_date` stocke donc une date locale (AAAA-MM-JJ).
 */

/** Décalage valide : de UTC−12 à UTC+14. */
export function clampOffset(offsetMinutes: number): number {
  if (!Number.isFinite(offsetMinutes)) return 0;
  return Math.min(720, Math.max(-840, Math.round(offsetMinutes)));
}

/** Date locale (AAAA-MM-JJ) d'un instant pour un décalage donné. */
export function localDate(now: Date, offsetMinutes: number): string {
  const local = new Date(now.getTime() - clampOffset(offsetMinutes) * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Instant UTC correspondant à minuit local du jour de `now`. */
export function localDayStart(now: Date, offsetMinutes: number): Date {
  const day = localDate(now, offsetMinutes);
  return new Date(Date.parse(`${day}T00:00:00Z`) + clampOffset(offsetMinutes) * 60_000);
}

/** Nombre de jours entre deux dates AAAA-MM-JJ (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
