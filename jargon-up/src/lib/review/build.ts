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

/**
 * Exercices de révision pour des termes donnés (ou, par défaut, les termes à réviser maintenant).
 * L'id de chaque exercice est l'id du terme.
 */
export async function buildReview(
  userId: string,
  fieldId: string,
  termIds?: string[],
): Promise<PlayableExercise[]> {
  const supabase = await createClient();

  let reviewsQuery = supabase
    .from("term_reviews")
    .select("term_id, repetitions")
    .eq("user_id", userId);
  reviewsQuery = termIds
    ? reviewsQuery.in("term_id", termIds)
    : reviewsQuery
        .lte("next_review_at", new Date().toISOString())
        .order("next_review_at")
        .limit(REVIEW_SESSION_SIZE);

  const [{ data: reviews, error }, { data: pool, error: poolError }] = await Promise.all([
    reviewsQuery,
    supabase.from("terms").select(TERM_COLUMNS).eq("field_id", fieldId).order("term"),
  ]);
  if (error) throw new Error(`Chargement des révisions : ${error.message}`);
  if (poolError) throw new Error(`Chargement des termes : ${poolError.message}`);

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

/** Nombre de termes à réviser maintenant. */
export async function countDueReviews(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("term_reviews")
    .select("term_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("next_review_at", new Date().toISOString());
  return count ?? 0;
}
