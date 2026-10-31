"use client";

import type { z } from "zod";
import type { fillBlankPayload } from "@/lib/exercises/schemas";
import { fr } from "@/lib/i18n/fr";
import { optionClass, type ExerciseProps } from "./types";

type Payload = z.infer<typeof fillBlankPayload>;

export function FillBlank({ payload, answer, onAnswer, status }: ExerciseProps<Payload>) {
  const choice = answer?.type === "fill_blank" ? answer.choice : null;
  const [before, after] = payload.sentence.split("___");

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-xl font-bold">{fr.lesson.prompts.fill_blank}</h2>
      <p lang="en" className="text-2xl leading-relaxed font-semibold">
        {before}
        <span
          className={`mx-1 inline-block min-w-24 rounded-field border-b-4 px-2 text-center ${
            choice ? "border-primary text-primary" : "border-base-300 text-transparent"
          }`}
        >
          {choice ?? "____"}
        </span>
        {after}
      </p>
      {payload.translation_fr && (
        <p className="text-sm text-base-content/60">« {payload.translation_fr} »</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {payload.choices.map((c) => (
          <button
            key={c}
            type="button"
            lang="en"
            aria-pressed={choice === c}
            disabled={status !== "answering"}
            onClick={() => onAnswer({ type: "fill_blank", choice: c })}
            className={`${optionClass({
              selected: choice === c,
              isAnswer: c === payload.answer,
              status,
            })} justify-center`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
