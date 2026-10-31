import type { Answer, ExerciseContent } from "./schemas.ts";

/** Minuscules, sans accents ni ponctuation, espaces normalisés. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' -]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Corrige une réponse. Utilisé côté client (retour immédiat) ET côté serveur (score officiel). */
export function isCorrect(exercise: ExerciseContent, answer: Answer): boolean {
  if (exercise.type !== answer.type) return false;

  switch (exercise.type) {
    case "multiple_choice":
    case "dialogue":
      return answer.type === exercise.type && answer.index === exercise.payload.answerIndex;
    case "fill_blank":
      return (
        answer.type === "fill_blank" &&
        normalizeText(answer.choice) === normalizeText(exercise.payload.answer)
      );
    case "order_words":
      return (
        answer.type === "order_words" &&
        normalizeText(answer.words.join(" ")) === normalizeText(exercise.payload.answer)
      );
    case "listen_type":
      return (
        answer.type === "listen_type" &&
        exercise.payload.accept.some((a) => normalizeText(a) === normalizeText(answer.text))
      );
    case "match_pairs":
      return answer.type === "match_pairs" && answer.mistakes === 0;
  }
}

/** Texte de la bonne réponse, affiché après une erreur. */
export function correctAnswerText(exercise: ExerciseContent): string {
  switch (exercise.type) {
    case "multiple_choice":
    case "dialogue":
      return exercise.payload.options[exercise.payload.answerIndex];
    case "fill_blank":
      return exercise.payload.sentence.replace("___", exercise.payload.answer);
    case "order_words":
      return exercise.payload.answer;
    case "listen_type":
      return exercise.payload.text;
    case "match_pairs":
      return exercise.payload.pairs.map((p) => `${p.left} = ${p.right}`).join(" · ");
  }
}
