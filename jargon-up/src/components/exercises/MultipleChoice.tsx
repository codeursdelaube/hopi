"use client";

import type { z } from "zod";
import type { multipleChoicePayload } from "@/lib/exercises/schemas";
import { optionClass, type ExerciseProps } from "./types";

type Payload = z.infer<typeof multipleChoicePayload>;

export function MultipleChoice({ payload, answer, onAnswer, status }: ExerciseProps<Payload>) {
  const selected = answer?.type === "multiple_choice" ? answer.index : null;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-2xl font-bold">{payload.question}</h2>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label={payload.question}>
        {payload.options.map((option, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected === i}
            disabled={status !== "answering"}
            onClick={() => onAnswer({ type: "multiple_choice", index: i })}
            className={optionClass({
              selected: selected === i,
              isAnswer: i === payload.answerIndex,
              status,
            })}
          >
            <kbd className="kbd shrink-0 kbd-sm">{i + 1}</kbd>
            <span>{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
