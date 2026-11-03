/**
 * Génère les exercices d'une leçon à partir de ses 8 termes, de ses phrases et dialogues.
 * Déterministe (graine = titre de la leçon) : relancer l'import donne les mêmes exercices.
 */
import type { ContentLesson, ContentTerm } from "./schema.ts";
import { exerciseSchema, type ExerciseContent } from "../lib/exercises/schemas.ts";
import { seededRandom, shuffle } from "../lib/random.ts";

export type GeneratedExercise = ExerciseContent & {
  /** Terme travaillé (pour la répétition espacée), ou null. */
  term: string | null;
  explanation_fr: string;
};

export { seededRandom, shuffle };

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Le terme en mot entier, sans tenir compte de la casse. Groupe 2 = le texte trouvé. */
function wholeWord(term: string) {
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(term)})(?=$|[^\\p{L}\\p{N}])`, "iu");
}

/** Forme exacte du terme dans la phrase (ex. « GET »), ou null s'il n'y figure pas. */
export function matchTerm(sentence: string, term: string): string | null {
  return sentence.match(wholeWord(term))?.[2] ?? null;
}

/** Remplace le terme dans la phrase par « ___ ». */
export function blankOut(sentence: string, term: string): string | null {
  const re = wholeWord(term);
  if (!re.test(sentence)) return null;
  return sentence.replace(re, (_m, before: string) => `${before}___`);
}

function others(terms: ContentTerm[], exclude: ContentTerm, count: number, random: () => number) {
  return shuffle(
    terms.filter((t) => t !== exclude),
    random,
  ).slice(0, count);
}

function choiceQuestion(
  question: string,
  correct: string,
  wrong: string[],
  random: () => number,
): ExerciseContent {
  const options = shuffle([correct, ...wrong], random);
  return {
    type: "multiple_choice",
    payload: { question, options, answerIndex: options.indexOf(correct) },
  };
}

function definitionQuestion(t: ContentTerm, all: ContentTerm[], random: () => number) {
  return choiceQuestion(
    `What does “${t.term}” mean?`,
    t.definition_en,
    others(all, t, 3, random).map((o) => o.definition_en),
    random,
  );
}

function translationQuestion(t: ContentTerm, all: ContentTerm[], random: () => number) {
  return choiceQuestion(
    `Comment dit-on « ${t.translation_fr} » en anglais ?`,
    t.term,
    others(all, t, 3, random).map((o) => o.term),
    random,
  );
}

function fillBlank(t: ContentTerm, all: ContentTerm[], random: () => number): ExerciseContent {
  const sentence = blankOut(t.example_en, t.term);
  if (!sentence) {
    throw new Error(`L'exemple de « ${t.term} » ne contient pas le terme : "${t.example_en}"`);
  }
  const answer = matchTerm(t.example_en, t.term)!;
  return {
    type: "fill_blank",
    payload: {
      sentence,
      answer,
      choices: shuffle([answer, ...others(all, t, 2, random).map((o) => o.term)], random),
      translation_fr: t.example_fr,
    },
  };
}

function matchPairs(terms: ContentTerm[], random: () => number): ExerciseContent {
  return {
    type: "match_pairs",
    payload: {
      pairs: shuffle(terms, random).map((t) => ({ left: t.term, right: t.translation_fr })),
    },
  };
}

function termExplanation(t: ContentTerm) {
  return `« ${t.term} » (${t.pos}) = ${t.translation_fr}. ${t.explanation_fr}`;
}

export function generateLessonExercises(lesson: ContentLesson): GeneratedExercise[] {
  const random = seededRandom(lesson.title_en);
  const t = lesson.terms;
  const withTerm = (term: ContentTerm, ex: ExerciseContent, extra = ""): GeneratedExercise => ({
    ...ex,
    term: term.term,
    explanation_fr: termExplanation(term) + extra,
  });
  const sentence = (i: number): GeneratedExercise | null => {
    const s = lesson.sentences[i];
    if (!s) return null;
    return {
      type: "order_words",
      payload: { words: shuffle(s.en.split(" "), random), answer: s.en, translation_fr: s.fr },
      term: null,
      explanation_fr: `« ${s.en} » = « ${s.fr} ».`,
    };
  };
  const pairsExplanation = (terms: ContentTerm[]) =>
    terms.map((x) => `${x.term} = ${x.translation_fr}`).join(" · ");

  const exercises: (GeneratedExercise | null)[] = [
    withTerm(t[0], definitionQuestion(t[0], t, random)),
    withTerm(t[1], translationQuestion(t[1], t, random)),
    withTerm(t[2], fillBlank(t[2], t, random), ` Phrase : « ${t[2].example_fr} »`),
    {
      ...matchPairs(t.slice(0, 4), random),
      term: null,
      explanation_fr: pairsExplanation(t.slice(0, 4)),
    },
    withTerm(t[3], fillBlank(t[3], t, random), ` Phrase : « ${t[3].example_fr} »`),
    withTerm(t[4], translationQuestion(t[4], t, random)),
    sentence(0),
    withTerm(t[5], definitionQuestion(t[5], t, random)),
    withTerm(t[6], {
      type: "listen_type",
      payload: { text: t[6].term, accept: [t[6].term, ...(t[6].accept ?? [])] },
    }),
    {
      ...matchPairs(t.slice(4, 8), random),
      term: null,
      explanation_fr: pairsExplanation(t.slice(4, 8)),
    },
    withTerm(t[7], fillBlank(t[7], t, random), ` Phrase : « ${t[7].example_fr} »`),
    sentence(1),
    ...lesson.dialogues.map((d): GeneratedExercise => {
      // Options mélangées : la bonne réponse n'est pas toujours à la même place.
      const correct = d.options[d.answerIndex];
      const options = shuffle(d.options, random);
      return {
        type: "dialogue",
        payload: {
          context: d.context,
          lines: d.lines,
          options,
          answerIndex: options.indexOf(correct),
        },
        term: null,
        explanation_fr: d.explanation_fr,
      };
    }),
  ];

  const result = exercises.filter((e): e is GeneratedExercise => e !== null);
  // Contrôle final : chaque exercice doit respecter le format attendu par l'appli.
  for (const ex of result) exerciseSchema.parse(ex);
  return result;
}
