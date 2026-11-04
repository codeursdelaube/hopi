import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH, NEXT_COOKIE, afterLoginPath, safeNextPath } from "@/lib/auth/paths";

/**
 * Retour de la connexion Google (via Supabase) : échange le `code` contre une session,
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

  return redirectTo(afterLoginPath(Boolean(profile?.field_id), next));
}
