import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers),
 * avec la session de l'utilisateur : les règles RLS s'appliquent.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    getPublicEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : écriture impossible.
            // Sans risque, car proxy.ts rafraîchit déjà la session à chaque requête.
          }
        },
      },
    },
  );
}
