import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth/paths";

/**
 * Retour de Google (via Supabase) : échange le `code` contre une session,
 * puis envoie vers l'onboarding si le profil n'est pas complété.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL(`${LOGIN_PATH}?error=oauth`, origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL(`${LOGIN_PATH}?error=callback`, origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("field_id")
    .eq("id", data.user.id)
    .maybeSingle();

  const destination = profile?.field_id ? next : "/onboarding";
  return NextResponse.redirect(new URL(destination, origin));
}
