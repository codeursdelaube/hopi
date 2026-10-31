"use client";

import { useEffect, useState } from "react";
import type { z } from "zod";
import type { listenTypePayload } from "@/lib/exercises/schemas";
import { canSpeak, speak } from "@/lib/speech";
import { fr } from "@/lib/i18n/fr";
import type { ExerciseProps } from "./types";

type Payload = z.infer<typeof listenTypePayload>;

/** Indice si l'audio est indisponible : une lettre sur deux masquée (« r_p_s_t_r_ »). */
function maskedHint(text: string) {
  return text.replace(/\p{L}/gu, (ch, offset: number) => (offset % 2 === 0 ? ch : "_"));
}

export function ListenType({ payload, answer, onAnswer, status }: ExerciseProps<Payload>) {
  const text = answer?.type === "listen_type" ? answer.text : "";
  const [audioOk, setAudioOk] = useState(true);

  useEffect(() => {
    // Détection côté client uniquement (pas de synthèse vocale pendant le rendu serveur).
    const ok = canSpeak();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dépend d'une API du navigateur
    setAudioOk(ok);
    if (ok) speak(payload.text);
  }, [payload.text]);

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-xl font-bold">{fr.lesson.prompts.listen_type}</h2>

      {audioOk ? (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => speak(payload.text)}
            className="btn btn-circle size-24 btn-pop text-4xl btn-primary"
            aria-label={fr.lesson.listen}
          >
            🔊
          </button>
          <button
            type="button"
            onClick={() => speak(payload.text, { slow: true })}
            className="btn btn-circle size-16 btn-pop text-2xl btn-secondary"
            aria-label={fr.lesson.listenSlow}
          >
            🐢
          </button>
        </div>
      ) : (
        <p className="rounded-box bg-base-200 p-4 text-center">
          {fr.lesson.noAudio}{" "}
          <span lang="en" className="font-mono text-xl font-bold tracking-widest">
            {maskedHint(payload.text)}
          </span>
        </p>
      )}

      <input
        type="text"
        lang="en"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={text}
        disabled={status !== "answering"}
        onChange={(e) =>
          onAnswer(e.target.value.trim() ? { type: "listen_type", text: e.target.value } : null)
        }
        placeholder={fr.lesson.typeHere}
        aria-label={fr.lesson.prompts.listen_type}
        className={`input w-full text-lg input-lg ${
          status === "correct" ? "input-success" : status === "wrong" ? "input-error" : ""
        }`}
      />
    </div>
  );
}
