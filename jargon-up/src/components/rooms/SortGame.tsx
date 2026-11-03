"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as m from "motion/react-m";
import { Check, Timer } from "lucide-react";
import { submitRoom } from "@/app/salle/actions";
import { formatDuration, type PublicPuzzle } from "@/lib/rooms/room";
import { playSound } from "@/lib/sound";
import { fr } from "@/lib/i18n/fr";

const t = fr.room;

/** Couleur de chaque thème (bordure, fond léger). */
const TONES = [
  "border-primary bg-primary/5",
  "border-secondary bg-secondary/10",
  "border-accent bg-accent/10",
  "border-info bg-info/10",
];

type Props = {
  roomId: string;
  puzzle: PublicPuzzle;
  /** Début de la partie (mesuré par le serveur), pour le chronomètre affiché. */
  startedAt: string;
  /** Temps limite fixé par l'hôte (secondes). */
  timeLimitSeconds: number;
  soundEnabled: boolean;
};

/** Dernières secondes : le chrono passe au rouge. */
const HURRY_MS = 15_000;

/**
 * Le jeu : toucher un terme, puis le thème où il va, avant la fin du compte à rebours.
 * À zéro, la partie est envoyée automatiquement. Correction et chronomètre officiel : serveur.
 */
export function SortGame({ roomId, puzzle, startedAt, timeLimitSeconds, soundEnabled }: Props) {
  const router = useRouter();
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const autoSent = useRef(false);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const limitMs = timeLimitSeconds * 1000;
  const remaining = Math.max(0, limitMs - elapsed);
  const timeUp = remaining <= 0;
  const hurry = !timeUp && remaining <= HURRY_MS;

  const pool = puzzle.terms.filter((term) => !placements[term.id]);
  const placedCount = puzzle.terms.length - pool.length;
  const selectedTerm = puzzle.terms.find((term) => term.id === selected) ?? null;
  const done = pool.length === 0;

  function place(conceptId: string) {
    if (!selected || pending || timeUp) return;
    setPlacements((p) => ({ ...p, [selected]: conceptId }));
    setSelected(null);
    playSound("tap", soundEnabled);
  }

  function unplace(termId: string) {
    if (pending || timeUp) return;
    setPlacements((p) => {
      const next = { ...p };
      delete next[termId];
      return next;
    });
    setSelected(termId);
  }

  const submit = useCallback(() => {
    setError(false);
    startTransition(async () => {
      const result = await submitRoom(roomId, {
        placements: Object.entries(placements).map(([termId, conceptId]) => ({
          termId,
          conceptId,
        })),
        offsetMinutes: new Date().getTimezoneOffset(),
      });
      if (result.ok || result.reason === "already") {
        playSound("complete", soundEnabled);
        router.refresh();
      } else {
        setError(true);
      }
    });
  }, [placements, roomId, router, soundEnabled]);

  // Temps écoulé : envoi automatique de ce qui est rangé (une seule fois).
  useEffect(() => {
    if (!timeUp || autoSent.current) return;
    autoSent.current = true;
    submit();
  }, [timeUp, submit]);

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between font-display text-lg font-bold">
          <span
            className={`flex items-center gap-2 text-2xl tabular-nums ${
              timeUp || hurry ? "text-error" : ""
            } ${hurry ? "animate-pulse" : ""}`}
            role="timer"
            aria-live="off"
          >
            <Timer className="size-6" aria-hidden /> {formatDuration(remaining)}
          </span>
          <span className="badge badge-lg badge-primary">
            {t.placed(placedCount, puzzle.terms.length)}
          </span>
        </div>
        <progress
          className={`progress h-3 w-full ${hurry || timeUp ? "progress-error" : "progress-accent"}`}
          value={remaining}
          max={limitMs}
          aria-hidden
        />
        {(hurry || timeUp) && (
          <p role="status" className="text-sm font-bold text-error">
            {timeUp ? t.timeUp : t.hurry}
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2 rounded-box border-2 border-dashed border-base-300 p-3">
        <h2 className="text-sm font-bold text-base-content/60">{done ? t.poolDone : t.pool}</h2>
        {!done && <p className="text-sm text-base-content/60">{t.pickTerm}</p>}
        <div className="flex min-h-12 flex-wrap gap-2">
          {pool.map((term) => (
            <m.button
              key={term.id}
              layoutId={term.id}
              type="button"
              lang="en"
              onClick={() => setSelected((s) => (s === term.id ? null : term.id))}
              disabled={timeUp}
              aria-pressed={selected === term.id}
              className={`btn min-h-11 btn-pop font-bold ${
                selected === term.id ? "btn-primary" : "border-base-300 bg-base-100"
              }`}
            >
              {term.term}
            </m.button>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {puzzle.concepts.map((concept, i) => {
          const terms = puzzle.terms.filter((term) => placements[term.id] === concept.id);
          return (
            <section
              key={concept.id}
              onClick={() => place(concept.id)}
              className={`flex min-h-28 flex-col gap-2 rounded-box border-2 p-3 transition-shadow ${
                TONES[i % TONES.length]
              } ${selectedTerm ? "cursor-pointer ring-2 ring-primary/40 ring-offset-2 ring-offset-base-100" : ""}`}
            >
              <h3 lang="en" className="font-display text-lg font-bold">
                {concept.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {terms.map((term) => (
                  <m.button
                    key={term.id}
                    layoutId={term.id}
                    type="button"
                    lang="en"
                    onClick={(e) => {
                      e.stopPropagation();
                      unplace(term.id);
                    }}
                    aria-label={t.removeTerm(term.term)}
                    disabled={timeUp}
                    className="btn min-h-11 border-base-300 bg-base-100 font-bold btn-sm"
                  >
                    {term.term}
                  </m.button>
                ))}
              </div>
              {selectedTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    place(concept.id);
                  }}
                  className="btn mt-auto btn-primary btn-sm"
                >
                  {t.placeHere(selectedTerm.term)}
                </button>
              )}
            </section>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-error">
          {t.submitError}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={(!done && !timeUp) || pending}
        className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
      >
        {pending ? (
          <span className="loading loading-spinner" aria-hidden />
        ) : (
          <Check className="size-6" strokeWidth={3} aria-hidden />
        )}
        {pending ? t.submitting : t.submit}
      </button>
    </div>
  );
}
