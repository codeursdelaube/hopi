import { z } from "zod";

/**
 * Variables publiques (exposées au navigateur).
 * Next.js n'injecte `NEXT_PUBLIC_*` côté client que si on y accède littéralement,
 * d'où l'objet construit à la main plutôt qu'un `process.env` générique.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
