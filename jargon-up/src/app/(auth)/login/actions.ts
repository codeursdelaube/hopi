"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError, Provider } from "@supabase/supabase-js";
import { z } from "zod";
import { isEmailLoginEnabled } from "@/lib/auth/email-login";
import { LOGIN_PATH, NEXT_COOKIE, afterLoginPath, safeNextPath } from "@/lib/auth/paths";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/** Page à rouvrir après la connexion (lue par /auth/callback). */
async function rememberNext(next: string) {
  (await cookies()).set(NEXT_COOKIE, encodeURIComponent(next), {
    path: "/",
    maxAge: 600,
    sameSite: "lax",
    httpOnly: true,
  });
}

async function callbackUrl() {
  const origin = (await headers()).get("origin") ?? SITE_URL;
  // URL de retour SANS paramètre : elle doit correspondre exactement à une « Redirect URL » Supabase.
  return `${origin}/auth/callback`;
}

/**
 * Lance la connexion OAuth CÔTÉ SERVEUR : la page de connexion n'a pas besoin de
 * télécharger la bibliothèque Supabase (~95 Ko), et le bouton marche même avant le JavaScript.
 * Le « code verifier » PKCE est posé en cookie par le client Supabase serveur.
 */
async function signInWith(provider: Provider, formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: await callbackUrl() },
  });
  if (error || !data.url) {
    console.error(`Connexion ${provider} :`, error?.message);
    redirect(`${LOGIN_PATH}?error=oauth`);
  }
  await rememberNext(next);
  redirect(data.url);
}

export async function signInWithGoogle(formData: FormData) {
  await signInWith("google", formData);
}

/* ------------------------------------------------------------------------------------------
 * Connexion par e-mail : un code à 6 chiffres (toute adresse, dont iCloud). Gratuit, sans
 * compte Google. L'e-mail contient aussi un lien, qui passe par /auth/callback.
 * ---------------------------------------------------------------------------------------- */

const emailSchema = z.email().max(254);
/** Supabase envoie 6 chiffres par défaut (longueur réglable de 6 à 10). */
const codeSchema = z.string().regex(/^\d{6,10}$/);

const isRateLimit = (error: AuthError) =>
  error.status === 429 || /rate_limit/.test(error.code ?? "");

export type SendCodeResult =
  { ok: true; email: string } | { ok: false; reason: "invalid" | "rate_limit" | "error" };

/** Envoie le code de connexion (crée le compte s'il n'existe pas encore). */
export async function sendEmailCode(rawEmail: string, rawNext: string): Promise<SendCodeResult> {
  // Formulaire caché quand la fonction est désactivée : on refuse aussi côté serveur.
  if (!isEmailLoginEnabled()) return { ok: false, reason: "error" };
  const parsed = emailSchema.safeParse(String(rawEmail).trim().toLowerCase());
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true, emailRedirectTo: await callbackUrl() },
  });
  if (error) {
    console.error("Envoi du code e-mail :", error.code, error.message);
    return { ok: false, reason: isRateLimit(error) ? "rate_limit" : "error" };
  }
  // Pour le lien de l'e-mail (il passe par /auth/callback, qui lit ce cookie).
  await rememberNext(safeNextPath(rawNext));
  return { ok: true, email: parsed.data };
}

export type VerifyCodeResult = { ok: false; reason: "invalid" | "error" };

/** Vérifie le code : ouvre la session, puis l'onboarding (nouveau compte) ou la page demandée. */
export async function verifyEmailCode(
  rawEmail: string,
  rawCode: string,
  rawNext: string,
): Promise<VerifyCodeResult> {
  const email = emailSchema.safeParse(String(rawEmail).trim().toLowerCase());
  const code = codeSchema.safeParse(String(rawCode).replace(/\s/g, ""));
  if (!email.success || !code.success) return { ok: false, reason: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: code.data,
    type: "email",
  });
  if (error || !data.user) {
    if (error) console.error("Vérification du code e-mail :", error.code, error.message);
    // Supabase répond « otp_expired » que le code soit faux OU expiré : un seul message.
    return { ok: false, reason: error && isRateLimit(error) ? "error" : "invalid" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("field_id")
    .eq("id", data.user.id)
    .maybeSingle();
  redirect(afterLoginPath(Boolean(profile?.field_id), safeNextPath(rawNext)));
}
