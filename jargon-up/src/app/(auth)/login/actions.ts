"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_PATH, NEXT_COOKIE, safeNextPath } from "@/lib/auth/paths";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/**
 * Lance la connexion Google CÔTÉ SERVEUR : la page de connexion n'a pas besoin de
 * télécharger la bibliothèque Supabase (~95 Ko), et le bouton marche même avant le JavaScript.
 * Le « code verifier » PKCE est posé en cookie par le client Supabase serveur.
 */
export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const origin = (await headers()).get("origin") ?? SITE_URL;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    // URL de retour SANS paramètre : elle doit correspondre exactement à une « Redirect URL » Supabase.
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) {
    console.error("Connexion Google :", error?.message);
    redirect(`${LOGIN_PATH}?error=oauth`);
  }

  // Page à rouvrir après la connexion (lue par /auth/callback).
  (await cookies()).set(NEXT_COOKIE, encodeURIComponent(next), {
    path: "/",
    maxAge: 600,
    sameSite: "lax",
    httpOnly: true,
  });
  redirect(data.url);
}
