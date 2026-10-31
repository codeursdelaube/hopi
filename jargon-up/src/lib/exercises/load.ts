import "server-only";
import { exerciseSchema, type PlayableExercise } from "@/lib/exercises/schemas";

type ExerciseRow = {
  id: string;
  type: string;
  payload: unknown;
  explanation_fr: string | null;
  term_id: string | null;
};

/** Valide les lignes `exercises` ; un exercice mal formé est ignoré (et signalé dans les logs). */
export function toPlayable(rows: ExerciseRow[]): PlayableExercise[] {
  return rows.flatMap((row) => {
    const parsed = exerciseSchema.safeParse({ type: row.type, payload: row.payload });
    if (!parsed.success) {
      console.error(`Exercice ${row.id} invalide :`, parsed.error.issues);
      return [];
    }
    return [
      { ...parsed.data, id: row.id, termId: row.term_id, explanation_fr: row.explanation_fr },
    ];
  });
}
