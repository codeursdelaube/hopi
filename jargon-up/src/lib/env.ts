import { z } from "zod";

/**
 * Variables publiques (exposées au navigateur).
 * Next.js n'injecte `NEXT_PUBLIC_*` côté client que si on y accède littéralement,
 * d'où l'objet construit à la main plutôt qu'un `process.env` générique.
 *
 * Vérification DIFFÉRÉE (à la première utilisation, pas au chargement du fichier) : sinon le
 * build échoue dès qu'une route importe ce module pendant la collecte des pages.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "NEXT_PUBLIC_SUPABASE_URL manquante ou invalide (.env.local / variables Vercel)",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string({
      error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquante (.env.local / variables Vercel)",
    })
    .min(1),
});

type PublicEnv = z.infer<typeof publicSchema>;
let cached: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
  cached ??= publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}
