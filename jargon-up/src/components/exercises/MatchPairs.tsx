"use client";

import { useMemo, useState } from "react";
import * as m from "motion/react-m";
import type { z } from "zod";
import type { matchPairsPayload } from "@/lib/exercises/schemas";
import { seededRandom, shuffle } from "@/lib/random";
import { fr } from "@/lib/i18n/fr";
import type { ExerciseProps } from "./types";

type Payload = z.infer<typeof matchPairsPayload>;
type Side = "left" | "right";

type Props = ExerciseProps<Payload> & {
  onMistake: () => void;
  onMatch: () => void;
};

/**
 * Associer les paires : on joue jusqu'à tout associer. La réponse transmise est le
 * nombre d'erreurs (0 = réussi du premier coup).
 */
export function MatchPairs({ payload, onAnswer, seed, onMistake, onMatch }: Props) {
  const { left, right } = useMemo(() => {
    const random = seededRandom(seed);
    const indices = payload.pairs.map((_, i) => i);
    return { left: shuffle(indices, random), right: shuffle(indices, random) };
  }, [payload.pairs, seed]);

  const [selected, setSelected] = useState<{ side: Side; index: number } | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState<{ left: number; right: number } | null>(null);

  function pick(side: Side, index: number) {
    if (matched.has(index)) return;
    if (!selected || selected.side === side) {
      setSelected({ side, index });
      return;
    }
    const [l, r] = side === "left" ? [index, selected.index] : [selected.index, index];
    setSelected(null);
    if (l === r) {
      const next = new Set(matched).add(l);
      setMatched(next);
      onMatch();
      if (next.size === payload.pairs.length) onAnswer({ type: "match_pairs", mistakes });
    } else {
      setMistakes((m) => m + 1);
      setWrong({ left: l, right: r });
      onMistake();
      setTimeout(() => setWrong(null), 500);
    }
  }

  function tile(side: Side, index: number) {
    const text = side === "left" ? payload.pairs[index].left : payload.pairs[index].right;
    const isMatched = matched.has(index);
    const isSelected = selected?.side === side && selected.index === index;
    const isWrong = wrong?.[side] === index;

    return (
      <m.button
        key={`${side}-${index}`}
        type="button"
        lang={side === "left" ? "en" : "fr"}
        disabled={isMatched}
        aria-pressed={isSelected}
        onClick={() => pick(side, index)}
        animate={isWrong ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className={`min-h-14 rounded-box border-2 px-3 py-2 text-base font-semibold transition-colors ${
          isMatched
            ? "border-success/40 bg-success/10 text-base-content/40"
            : isWrong
              ? "border-error bg-error/15"
              : isSelected
                ? "border-primary bg-primary/10 shadow-[0_4px_0_0_var(--color-primary)]"
                : "border-base-300 shadow-[0_4px_0_0_var(--color-base-300)] hover:bg-base-200"
        }`}
      >
        {text}
      </m.button>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-xl font-bold">{fr.lesson.prompts.match_pairs}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">{left.map((i) => tile("left", i))}</div>
        <div className="flex flex-col gap-3">{right.map((i) => tile("right", i))}</div>
      </div>
    </div>
  );
}
