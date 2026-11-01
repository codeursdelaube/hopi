import "server-only";
import { blankOut, matchTerm } from "@/content/generate";
import type { ExerciseContent, PlayableExercise } from "@/lib/exercises/schemas";
import { seededRandom, shuffle } from "@/lib/random";
import { createClient } from "@/lib/supabase/server";

/** Nombre maximum de termes par séance de révision. */
export const REVIEW_SESSION_SIZE = 12;

type ReviewTerm = {
  id: string;
  term: string;
  definition_en: string;
  explanation_fr: string;
  example_en: string;
  example_fr: string | null;
};

const TERM_COLUMNS = "id, term, definition_en, explanation_fr, example_en, example_fr";

/**
 * Construit l'exercice de révision d'un terme. Déterministe (graine = terme + nombre de
 * répétitions) : le serveur peut le reconstruire à l'identique pour corriger les réponses.
 */
function buildExercise(term: ReviewTerm, repetitions: number, pool: ReviewTerm[]): ExerciseContent {
  const random = seededRandom(`${term.id}:${repetitions}`);
  const others = shuffle(
    pool.filter((p) => p.id !== term.id),
    random,
  );
  const kind = Math.floor(random() * 3);

  if (kind === 1) {
    return { type: "listen_type", payload: { text: term.term, accept: [term.term] } };
  }
  const sentence = kind === 2 ? blankOut(term.example_en, term.term) : null;
  const answer = sentence ? matchTerm(term.example_en, term.term) : null;
  if (sentence && answer) {
    return {
      type: "fill_blank",
      payload: {
        sentence,
        answer,
        choices: shuffle([answer, ...others.slice(0, 2).map((o) => o.term)], random),
        translation_fr: term.example_fr ?? undefined,
      },
    };
  }
  const options = shuffle(
    [term.definition_en, ...others.slice(0, 3).map((o) => o.definition_en)],
    random,
  );
  return {
    type: "multiple_choice",
    payload: {
      question: `What does “${term.term}” mean?`,
      options,
      answerIndex: options.indexOf(term.definition_en),
    },
  };
}

export type ReviewSession = {
  exercises: PlayableExercise[];
  /** « due » : mots à réviser maintenant ; « practice » : entraînement libre (rien n'était dû). */
  mode: "due" | "practice";
};

/** Termes de la filière (sert aussi de réserve de distracteurs). */
async function fieldTerms(fieldId: string): Promise<ReviewTerm[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("terms")
    .select(TERM_COLUMNS)
    .eq("field_id", fieldId)
    .order("term");
  if (error) throw new Error(`Chargement des termes : ${error.message}`);
  return data;
}

function toExercises(
  reviews: { term_id: string; repetitions: number }[],
  pool: ReviewTerm[],
): PlayableExercise[] {
  const termsById = new Map(pool.map((t) => [t.id, t]));
  return reviews.flatMap((r) => {
    const term = termsById.get(r.term_id);
    if (!term) return [];
    return [
      {
        ...buildExercise(term, r.repetitions, pool),
        id: term.id,
        termId: term.id,
        explanation_fr: `« ${term.term} » : ${term.explanation_fr}`,
      },
    ];
  });
}

/**
 * Séance de révision de la filière actuelle :
 * - les mots dont la date de révision est passée (SM-2) ;
 * - sinon, un entraînement libre sur les mots déjà appris, en commençant par ceux qui
 *   reviendront le plus tôt (pour que « Réviser » marche aussi juste après une leçon).
 * Seuls les mots de la filière actuelle sont pris (utile après un changement de filière).
 */
export async function buildReviewSession(userId: string, fieldId: string): Promise<ReviewSession> {
  const supabase = await createClient();
  const pool = await fieldTerms(fieldId);
  if (pool.length === 0) return { exercises: [], mode: "due" };
  const poolIds = pool.map((t) => t.id);

  const base = () =>
    supabase
      .from("term_reviews")
      .select("term_id, repetitions")
      .eq("user_id", userId)
      .in("term_id", poolIds)
      .order("next_review_at")
      .limit(REVIEW_SESSION_SIZE);

  const { data: due, error } = await base().lte("next_review_at", new Date().toISOString());
  if (error) throw new Error(`Chargement des révisions : ${error.message}`);
  if (due.length > 0) return { exercises: toExercises(due, pool), mode: "due" };

  const { data: learned, error: learnedError } = await base();
  if (learnedError) throw new Error(`Chargement des révisions : ${learnedError.message}`);
  return { exercises: toExercises(learned, pool), mode: "practice" };
}

/**
 * Reconstruit à l'identique les exercices de termes donnés (pour corriger côté serveur).
 * L'id de chaque exercice est l'id du terme.
 */
export async function buildReviewForTerms(
  userId: string,
  fieldId: string,
  termIds: string[],
): Promise<PlayableExercise[]> {
  const supabase = await createClient();
  const [pool, { data: reviews, error }] = await Promise.all([
    fieldTerms(fieldId),
    supabase
      .from("term_reviews")
      .select("term_id, repetitions")
      .eq("user_id", userId)
      .in("term_id", termIds),
  ]);
  if (error) throw new Error(`Chargement des révisions : ${error.message}`);
  return toExercises(reviews, pool);
}

/** Nombre de mots de la filière actuelle à réviser maintenant. */
export async function countDueReviews(userId: string, fieldId: string): Promise<number> {
  const supabase = await createClient();
  const pool = await fieldTerms(fieldId);
  if (pool.length === 0) return 0;
  const { count } = await supabase
    .from("term_reviews")
    .select("term_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in(
      "term_id",
      pool.map((t) => t.id),
    )
    .lte("next_review_at", new Date().toISOString());
  return count ?? 0;
}
