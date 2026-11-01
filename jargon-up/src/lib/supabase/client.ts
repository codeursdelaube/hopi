import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/** Client Supabase pour les composants client (navigateur). */
export function createClient() {
  return createBrowserClient<Database>(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    getPublicEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
