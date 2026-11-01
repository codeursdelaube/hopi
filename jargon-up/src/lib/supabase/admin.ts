import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client « administrateur » (clé secrète) : contourne RLS.
 * Réservé aux Server Actions qui écrivent XP, streak, progression, APRÈS avoir
 * vérifié l'utilisateur. Ne jamais l'importer dans du code client.
 */
export function createAdminClient() {
  const secretKey = z
    .string({ error: "SUPABASE_SECRET_KEY manquante dans .env.local" })
    .min(1)
    .parse(process.env.SUPABASE_SECRET_KEY);

  return createClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
