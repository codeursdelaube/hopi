import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/types/database";

export type DailyTerm = Pick<
  Row<"terms">,
  | "id"
  | "term"
  | "part_of_speech"
  | "definition_en"
  | "explanation_fr"
  | "example_en"
  | "example_fr"
  | "pronunciation_ipa"
>;

const TERM_COLUMNS =
  "id, term, part_of_speech, definition_en, explanation_fr, example_en, example_fr, pronunciation_ipa";

/** Jour du « Mot du jour » : jour UTC (= heure du Togo). Le même mot pour tous, partout. */
export function wordDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Choix déterministe d'un index à partir de la date (même jour → même mot). */
export function dayIndex(day: string, count: number): number {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return count > 0 ? h % count : 0;
}

/**
 * Mot du jour d'une filière. S'il n'a pas encore été tiré aujourd'hui, on le choisit
 * et on l'enregistre dans `daily_words` (avec la clé secrète : table en lecture seule pour les utilisateurs).
 */
export async function getWordOfDay(fieldId: string): Promise<DailyTerm | null> {
  const supabase = await createClient();
  const day = wordDay();

  const { data: existing } = await supabase
    .from("daily_words")
    .select("term_id")
    .eq("field_id", fieldId)
    .eq("day", day)
    .maybeSingle();

  let termId = existing?.term_id ?? null;

  if (!termId) {
    const { data: terms, error } = await supabase
      .from("terms")
      .select("id")
      .eq("field_id", fieldId)
      .order("term");
    if (error) throw new Error(`Chargement des termes : ${error.message}`);
    if (terms.length === 0) return null;

    termId = terms[dayIndex(day, terms.length)].id;
    const { error: insertError } = await createAdminClient()
      .from("daily_words")
      .upsert(
        { field_id: fieldId, day, term_id: termId },
        { onConflict: "field_id,day", ignoreDuplicates: true },
      );
    if (insertError) throw new Error(`Enregistrement du mot du jour : ${insertError.message}`);
  }

  const { data: term, error } = await supabase
    .from("terms")
    .select(TERM_COLUMNS)
    .eq("id", termId)
    .single();
  if (error) throw new Error(`Chargement du mot du jour : ${error.message}`);
  return term;
}

/** L'utilisateur a-t-il déjà validé le mot du jour (depuis minuit UTC) ? */
export async function hasClaimedWordOfDay(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source", "word_of_day")
    .gte("created_at", `${wordDay()}T00:00:00Z`);
  return (count ?? 0) > 0;
}
