"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { z } from "zod";
import type { orderWordsPayload } from "@/lib/exercises/schemas";
import { fr } from "@/lib/i18n/fr";
import type { ExerciseProps } from "./types";

type Payload = z.infer<typeof orderWordsPayload>;

const chip =
  "min-h-11 rounded-field border-2 border-base-300 bg-base-100 px-3 py-1.5 text-lg font-semibold shadow-[0_3px_0_0_var(--color-base-300)]";

export function OrderWords({ payload, onAnswer, status }: ExerciseProps<Payload>) {
  // Indices des mots choisis (un même mot peut apparaître deux fois dans la banque).
  const [picked, setPicked] = useState<number[]>([]);
  const locked = status !== "answering";

  function update(next: number[]) {
    setPicked(next);
    onAnswer(
      next.length > 0 ? { type: "order_words", words: next.map((i) => payload.words[i]) } : null,
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-xl font-bold">{fr.lesson.prompts.order_words}</h2>
      {payload.translation_fr && (
        <div className="chat-start chat">
          <div className="chat-bubble text-lg">{payload.translation_fr}</div>
        </div>
      )}

      <div
        className={`flex min-h-28 flex-wrap content-start gap-2 border-y-2 py-3 ${
          status === "correct"
            ? "border-success"
            : status === "wrong"
              ? "border-error"
              : "border-base-300"
        }`}
        aria-label={fr.lesson.tapWords}
      >
        {picked.map((wordIndex, pos) => (
          <motion.button
            layoutId={`word-${wordIndex}`}
            key={wordIndex}
            type="button"
            lang="en"
            disabled={locked}
            onClick={() => update(picked.filter((_, p) => p !== pos))}
            className={chip}
            aria-label={fr.lesson.removeWord(payload.words[wordIndex])}
          >
            {payload.words[wordIndex]}
          </motion.button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {payload.words.map((word, i) =>
          picked.includes(i) ? (
            <span key={i} className={`${chip} invisible`} aria-hidden>
              {word}
            </span>
          ) : (
            <motion.button
              layoutId={`word-${i}`}
              key={i}
              type="button"
              lang="en"
              disabled={locked}
              onClick={() => update([...picked, i])}
              className={chip}
              aria-label={fr.lesson.addWord(word)}
            >
              {word}
            </motion.button>
          ),
        )}
      </div>
    </div>
  );
}
