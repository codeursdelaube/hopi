"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { explainMistake } from "@/app/actions/explain";
import { AI_EXPLAIN } from "@/lib/ai/explain";
import type { Answer } from "@/lib/exercises/schemas";
import { fr } from "@/lib/i18n/fr";

const t = fr.lesson.ai;

type Props = {
  source: "lesson" | "review";
  exerciseId: string;
  answer: Answer;
  /** Erreurs précédentes sur cet exercice : l'IA change d'angle. */
  previousMistakes: number;
};

/** Bouton « Explique-moi » après une erreur : une explication rédigée par l'IA sur le moment. */
export function AiExplain({ source, exerciseId, answer, previousMistakes }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ask() {
    const next = attempt + 1;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await explainMistake({
          source,
          exerciseId,
          answer,
          attempt: next,
          previousMistakes,
        });
        if (result.ok) {
          setText(result.text);
          setAttempt(next);
          setRemaining(result.remaining);
        } else {
          setMessage(result.reason === "limit" ? t.limit(AI_EXPLAIN.dailyLimit) : t.unavailable);
        }
      } catch {
        // Réseau coupé : l'explication écrite reste disponible.
        setMessage(t.unavailable);
      }
    });
  }

  const canAskAgain = attempt < AI_EXPLAIN.maxAttempts && remaining !== 0;

  return (
    <div className="flex flex-col gap-1">
      {text && (
        <p
          aria-live="polite"
          className="max-h-[30vh] overflow-y-auto rounded-box bg-base-100 p-3 text-sm leading-relaxed"
        >
          {text}
        </p>
      )}
      {canAskAgain && (
        <button
          type="button"
          onClick={ask}
          disabled={pending}
          className="flex link items-center gap-1 self-start text-sm font-semibold link-hover"
        >
          {pending ? (
            <span className="loading loading-xs loading-spinner" aria-hidden />
          ) : text ? (
            <RefreshCw className="size-4" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          {pending ? t.loading : text ? t.again : t.ask}
        </button>
      )}
      {remaining !== null && (
        <p className="text-xs text-base-content/60">{t.remaining(remaining)}</p>
      )}
      {message && (
        <p role="status" className="text-sm text-base-content/70">
          {message}
        </p>
      )}
    </div>
  );
}
