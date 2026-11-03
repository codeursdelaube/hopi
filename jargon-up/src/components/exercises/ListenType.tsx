"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { z } from "zod";
import type { listenTypePayload } from "@/lib/exercises/schemas";
import { Lightbulb, Snail, Volume2 } from "lucide-react";
import { canSpeak, getSpeechState, speak, subscribeSpeech } from "@/lib/speech";
import { fr } from "@/lib/i18n/fr";
import type { ExerciseProps } from "./types";

type Payload = z.infer<typeof listenTypePayload>;

const t = fr.lesson;

/** Indice : une lettre sur deux masquée (« r_p_s_t_r_ »), les espaces et tirets restent visibles. */
function maskedHint(text: string) {
  let letter = 0;
  return text.replace(/\p{L}/gu, (ch) => (letter++ % 2 === 0 ? ch : "_"));
}

export function ListenType({ payload, answer, onAnswer, status }: ExerciseProps<Payload>) {
  const text = answer?.type === "listen_type" ? answer.text : "";
  const [audioOk, setAudioOk] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechState, () => "idle" as const);
  const wordCount = payload.text.split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    // Détection côté client uniquement (pas de synthèse vocale pendant le rendu serveur).
    // Le mot est en général déjà lancé au toucher sur « Continuer » (voir LessonPlayer) ;
    // speak() ignore alors ce second appel.
    const ok = canSpeak();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dépend d'une API du navigateur
    setAudioOk(ok);
    setShowHint(false);
    if (ok) speak(payload.text);
  }, [payload.text]);

  // Son indisponible ou en échec : l'indice s'affiche d'office (pas d'exercice bloquant).
  const failed = !audioOk || speech === "failed";
  const hintVisible = showHint || failed;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-xl font-bold">{t.prompts.listen_type}</h2>

      {audioOk && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => speak(payload.text)}
              className="btn relative btn-circle size-24 btn-pop btn-primary"
              aria-label={t.listen}
            >
              {speech === "speaking" && (
                <span
                  className="absolute inset-0 animate-ping rounded-full bg-primary/40"
                  aria-hidden
                />
              )}
              {speech === "loading" ? (
                <span className="loading loading-lg loading-spinner" aria-hidden />
              ) : (
                <Volume2 className="relative size-11" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => speak(payload.text, { slow: true })}
              className="btn btn-circle size-16 btn-pop btn-secondary"
              aria-label={t.listenSlow}
            >
              <Snail className="size-8" aria-hidden />
            </button>
          </div>
          <p className="h-5 text-sm text-base-content/60" aria-live="polite">
            {speech === "loading" ? t.loadingAudio : speech === "speaking" ? t.playing : ""}
          </p>
        </div>
      )}

      {hintVisible ? (
        <p className="rounded-box bg-base-200 p-4 text-center">
          {failed && (
            <span className="mb-1 block text-sm">{audioOk ? t.audioFailed : t.noAudio}</span>
          )}
          <span lang="en" className="font-mono text-xl font-bold tracking-widest break-words">
            {maskedHint(payload.text)}
          </span>
          {wordCount > 1 && (
            <span className="mt-1 block text-sm text-base-content/60">{t.words(wordCount)}</span>
          )}
        </p>
      ) : (
        status === "answering" && (
          <button
            type="button"
            onClick={() => setShowHint(true)}
            className="btn self-center btn-ghost btn-sm"
          >
            <Lightbulb className="size-4" aria-hidden /> {t.hint}
          </button>
        )
      )}

      <input
        type="text"
        lang="en"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        value={text}
        disabled={status !== "answering"}
        onChange={(e) =>
          onAnswer(e.target.value.trim() ? { type: "listen_type", text: e.target.value } : null)
        }
        placeholder={t.typeHere}
        aria-label={t.prompts.listen_type}
        className={`input w-full text-lg input-lg ${
          status === "correct" ? "input-success" : status === "wrong" ? "input-error" : ""
        }`}
      />
    </div>
  );
}
