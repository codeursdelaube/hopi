"use client";

import { useState } from "react";
import { NEXT_COOKIE } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/client";
import { fr } from "@/lib/i18n/fr";

export function GoogleButton({ next }: { next: string }) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setLoading(true);
    setFailed(false);
    // L'URL de retour doit correspondre EXACTEMENT à une « Redirect URL » autorisée dans Supabase,
    // sinon Supabase renvoie vers la « Site URL ». On ne met donc aucun paramètre dedans :
    // la page à rouvrir après connexion passe par un cookie de courte durée.
    document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    // En cas de succès, le navigateur part vers Google : on ne revient ici qu'en cas d'erreur.
    if (error) {
      setLoading(false);
      setFailed(true);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        className="btn w-full btn-pop border-base-300 bg-base-100 font-display text-lg btn-lg"
      >
        {loading ? (
          <span className="loading loading-md loading-spinner" aria-hidden />
        ) : (
          <GoogleLogo />
        )}
        {loading ? fr.auth.redirecting : fr.auth.google}
      </button>
      {failed && (
        <p role="alert" className="text-center text-sm text-error">
          {fr.auth.errors.oauth}
        </p>
      )}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
