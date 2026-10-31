import { describe, expect, it } from "vitest";
import { correctAnswerText, isCorrect, normalizeText } from "./grade";
import type { ExerciseContent } from "./schemas";

const mc: ExerciseContent = {
  type: "multiple_choice",
  payload: { question: "What does 'deploy' mean?", options: ["a", "b", "c"], answerIndex: 1 },
};

describe("normalizeText", () => {
  it("ignore casse, accents, ponctuation et espaces", () => {
    expect(normalizeText("  Hello,   Wörld! ")).toBe("hello world");
    expect(normalizeText("I’m here.")).toBe("i'm here");
  });
});

describe("isCorrect", () => {
  it("choix multiple", () => {
    expect(isCorrect(mc, { type: "multiple_choice", index: 1 })).toBe(true);
    expect(isCorrect(mc, { type: "multiple_choice", index: 0 })).toBe(false);
  });

  it("refuse une réponse d'un autre type", () => {
    expect(isCorrect(mc, { type: "dialogue", index: 1 })).toBe(false);
  });

  it("phrase à trous", () => {
    const ex: ExerciseContent = {
      type: "fill_blank",
      payload: { sentence: "The ___ is down.", answer: "server", choices: ["server", "bug"] },
    };
    expect(isCorrect(ex, { type: "fill_blank", choice: "Server" })).toBe(true);
    expect(isCorrect(ex, { type: "fill_blank", choice: "bug" })).toBe(false);
  });

  it("mots dans l'ordre", () => {
    const ex: ExerciseContent = {
      type: "order_words",
      payload: { words: ["code", "I", "push", "my"], answer: "I push my code" },
    };
    expect(isCorrect(ex, { type: "order_words", words: ["I", "push", "my", "code"] })).toBe(true);
    expect(isCorrect(ex, { type: "order_words", words: ["I", "my", "push", "code"] })).toBe(false);
  });

  it("dictée : tolère majuscules et ponctuation", () => {
    const ex: ExerciseContent = {
      type: "listen_type",
      payload: { text: "repository", accept: ["repository", "repo"] },
    };
    expect(isCorrect(ex, { type: "listen_type", text: " Repository. " })).toBe(true);
    expect(isCorrect(ex, { type: "listen_type", text: "repo" })).toBe(true);
    expect(isCorrect(ex, { type: "listen_type", text: "repositry" })).toBe(false);
  });

  it("paires : correct seulement sans erreur", () => {
    const ex: ExerciseContent = {
      type: "match_pairs",
      payload: {
        pairs: [
          { left: "bug", right: "erreur" },
          { left: "fix", right: "correctif" },
        ],
      },
    };
    expect(isCorrect(ex, { type: "match_pairs", mistakes: 0 })).toBe(true);
    expect(isCorrect(ex, { type: "match_pairs", mistakes: 2 })).toBe(false);
  });
});

describe("correctAnswerText", () => {
  it("remplit le trou de la phrase", () => {
    expect(
      correctAnswerText({
        type: "fill_blank",
        payload: { sentence: "The ___ is down.", answer: "server", choices: ["server", "bug"] },
      }),
    ).toBe("The server is down.");
  });
});
