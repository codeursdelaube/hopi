"use client";

import type { z } from "zod";
import type { dialoguePayload } from "@/lib/exercises/schemas";
import { fr } from "@/lib/i18n/fr";
import { optionClass, type ExerciseProps } from "./types";

type Payload = z.infer<typeof dialoguePayload>;

export function Dialogue({ payload, answer, onAnswer, status }: ExerciseProps<Payload>) {
  const selected = answer?.type === "dialogue" ? answer.index : null;

  return (
    <div className="flex flex-col gap-5">
      <span className="badge self-start badge-soft badge-accent">{payload.context}</span>
      <div className="flex flex-col gap-1">
        {payload.lines.map((line, i) => (
          <div key={i} className="chat-start chat">
            <div className="chat-header font-semibold">{line.speaker}</div>
            <div lang="en" className="chat-bubble text-lg">
              {line.text}
            </div>
          </div>
        ))}
      </div>
      <h2 className="font-display text-xl font-bold">{fr.lesson.prompts.dialogue}</h2>
      <div
        className="flex flex-col gap-3"
        role="radiogroup"
        aria-label={fr.lesson.prompts.dialogue}
      >
        {payload.options.map((option, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            lang="en"
            aria-checked={selected === i}
            disabled={status !== "answering"}
            onClick={() => onAnswer({ type: "dialogue", index: i })}
            className={optionClass({
              selected: selected === i,
              isAnswer: i === payload.answerIndex,
              status,
            })}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
