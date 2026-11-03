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

/** Forme compacte pour la dictée : sans espaces, tirets ni apostrophes (« back end » = « backend »). */
function compact(text: string): string {
  return normalizeText(text).replace(/[\s'-]/g, "");
}

/** Distance d'édition (insertions, suppressions, substitutions). */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** Fautes de frappe tolérées selon la longueur du mot attendu (lettres, sans espaces). */
export function typoAllowance(length: number): number {
  if (length <= 4) return 0;
  return length <= 11 ? 1 : 2;
}

/**
 * Dictée : « exact » (aux espaces, tirets et majuscules près), « typo » (petite faute de
 * frappe tolérée sur un mot assez long, première lettre juste) ou « wrong ».
 * Un mot entendu ne se devine pas lettre à lettre : une faute de frappe ne doit pas tout faire rater.
 */
export function matchListen(accept: readonly string[], typed: string): "exact" | "typo" | "wrong" {
  const answer = compact(typed);
  if (!answer) return "wrong";
  let result: "typo" | "wrong" = "wrong";
  for (const option of accept) {
    const expected = compact(option);
    if (answer === expected) return "exact";
    if (
      answer[0] === expected[0] &&
      editDistance(answer, expected) <= typoAllowance(expected.length)
    ) {
      result = "typo";
    }
  }
  return result;
}

/** Bonne réponse avec une faute de frappe tolérée (pour afficher la bonne orthographe). */
export function isTypo(exercise: ExerciseContent, answer: Answer): boolean {
  return (
    exercise.type === "listen_type" &&
    answer.type === "listen_type" &&
    matchListen(exercise.payload.accept, answer.text) === "typo"
  );
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
        matchListen(exercise.payload.accept, answer.text) !== "wrong"
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
