/** Routes qui exigent une session. */
export const PRIVATE_PREFIXES = [
  "/learn",
  "/onboarding",
  "/lesson",
  "/review",
  "/word-of-the-day",
  "/leaderboard",
  "/profile",
  "/settings",
  "/upgrade",
] as const;

export const LOGIN_PATH = "/login";

/** Cookie temporaire : page à rouvrir après la connexion Google. */
export const NEXT_COOKIE = "hopi_next";
export const HOME_PATH = "/learn";

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Valide le paramètre `next` d'une redirection : uniquement un chemin interne,
 * pour éviter les redirections ouvertes (`//evil.com`, `https://…`, `/\evil.com`).
 */
export function safeNextPath(next: string | null | undefined, fallback = HOME_PATH): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

/**
 * Page à ouvrir juste après la connexion (Google ou code e-mail) : l'onboarding pour un
 * nouveau compte (sans filière), en gardant la page demandée pour après (ex. une salle
 * d'ami) ; sinon directement la page demandée.
 */
export function afterLoginPath(hasField: boolean, next: string): string {
  if (hasField) return next;
  return next === HOME_PATH ? "/onboarding" : `/onboarding?next=${encodeURIComponent(next)}`;
}
