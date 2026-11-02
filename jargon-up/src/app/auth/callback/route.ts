import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HOME_PATH, LOGIN_PATH, NEXT_COOKIE, safeNextPath } from "@/lib/auth/paths";

/**
 * Retour de Google (via Supabase) : échange le `code` contre une session,
 * puis envoie vers l'onboarding si le profil n'est pas complété.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(
    request.cookies.get(NEXT_COOKIE)?.value
      ? decodeURIComponent(request.cookies.get(NEXT_COOKIE)!.value)
      : null,
  );

  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.delete(NEXT_COOKIE);
    return response;
  };

  // Google ou Supabase peuvent renvoyer une erreur (accès refusé, URL non autorisée…).
  if (!code || searchParams.has("error")) {
    if (searchParams.has("error")) {
      console.error("OAuth :", searchParams.get("error"), searchParams.get("error_description"));
    }
    return redirectTo(`${LOGIN_PATH}?error=oauth`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("Échange du code OAuth :", error?.message);
    return redirectTo(`${LOGIN_PATH}?error=callback`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("field_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.field_id) return redirectTo(next);
  // Nouveau compte : onboarding d'abord, puis la page demandée (ex. le défi d'un ami).
  return redirectTo(
    next === HOME_PATH ? "/onboarding" : `/onboarding?next=${encodeURIComponent(next)}`,
  );
}
