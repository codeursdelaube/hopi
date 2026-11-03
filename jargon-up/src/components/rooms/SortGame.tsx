"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { RotateCcw, Timer } from "lucide-react";
import { submitRoom } from "@/app/salle/actions";
import { formatDuration, type PublicPuzzle } from "@/lib/rooms/room";
import { playSound } from "@/lib/sound";
import { fr } from "@/lib/i18n/fr";

const t = fr.room;

/** Couleur de chaque catégorie (gros boutons du bas). */
const TONES = ["btn-primary", "btn-secondary", "btn-accent", "btn-info"];

type Props = {
  roomId: string;
  puzzle: PublicPuzzle;
  /** Début de la partie (mesuré par le serveur), pour le compte à rebours affiché. */
  startedAt: string;
  /** Temps limite fixé par l'hôte (secondes). */
  timeLimitSeconds: number;
  soundEnabled: boolean;
};

/** Dernières secondes : le chrono passe au rouge. */
const HURRY_MS = 15_000;

type Placements = Record<string, string>;

/**
 * Le jeu, un mot à la fois : le mot apparaît, on touche sa catégorie en bas, il disparaît
 * aussitôt et le suivant arrive. Après le dernier mot (ou à la fin du chrono), la partie est
 * envoyée automatiquement. Correction et chronomètre officiel : côté serveur.
 */
export function SortGame({ roomId, puzzle, startedAt, timeLimitSeconds, soundEnabled }: Props) {
  const router = useRouter();
  const [placements, setPlacements] = useState<Placements>({});
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const sent = useRef(false);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const limitMs = timeLimitSeconds * 1000;
  const remaining = Math.max(0, limitMs - elapsed);
  const timeUp = remaining <= 0;
  const hurry = !timeUp && remaining <= HURRY_MS;
  const total = puzzle.terms.length;
  const current = puzzle.terms[index] ?? null;
  const finished = current === null;
  const locked = finished || timeUp || pending;

  const submit = useCallback(
    (answers: Placements) => {
      sent.current = true;
      setError(false);
      startTransition(async () => {
        const result = await submitRoom(roomId, {
          placements: Object.entries(answers).map(([termId, conceptId]) => ({
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
    },
    [roomId, router, soundEnabled],
  );

  const classify = useCallback(
    (conceptId: string) => {
      if (!current || locked) return;
      const next = { ...placements, [current.id]: conceptId };
      setPlacements(next);
      setIndex((i) => i + 1);
      playSound("tap", soundEnabled);
      // Dernier mot : on envoie tout de suite.
      if (index + 1 >= total) submit(next);
    },
    [current, index, locked, placements, soundEnabled, submit, total],
  );

  // Temps écoulé : envoi automatique de ce qui est classé (une seule fois).
  useEffect(() => {
    if (timeUp && !sent.current) submit(placements);
  }, [timeUp, placements, submit]);

  // Clavier (ordinateur, tablette) : touches 1 à 4 = catégories.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = Number(e.key);
      if (n >= 1 && n <= puzzle.concepts.length) classify(puzzle.concepts[n - 1].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [classify, puzzle.concepts]);

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
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
            {t.wordCount(Math.min(index + 1, total), total)}
          </span>
        </div>
        <progress
          className={`progress h-3 w-full ${hurry || timeUp ? "progress-error" : "progress-accent"}`}
          value={remaining}
          max={limitMs}
          aria-hidden
        />
        {(hurry || timeUp) && !finished && (
          <p role="status" className="text-sm font-bold text-error">
            {timeUp ? t.timeUp : t.hurry}
          </p>
        )}
      </div>

      {/* Le mot du moment, en grand : il disparaît dès qu'on a choisi sa catégorie. */}
      <div className="flex min-h-48 flex-1 items-center justify-center" aria-live="assertive">
        <AnimatePresence mode="popLayout" initial={false}>
          {current && !timeUp ? (
            <m.p
              key={current.id}
              lang="en"
              initial={{ opacity: 0, scale: 0.6, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 60 }}
              transition={{ duration: 0.15 }}
              className="rounded-box border-4 border-base-300 bg-base-100 px-8 py-6 text-center font-display text-4xl font-bold break-words shadow-[0_6px_0_0_var(--color-base-300)] sm:text-5xl"
            >
              {current.term}
            </m.p>
          ) : (
            <m.p
              key="end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-display text-xl font-bold"
              role="status"
            >
              {pending && <span className="loading loading-spinner" aria-hidden />}
              {pending ? t.submitting : timeUp ? t.timeUp : ""}
            </m.p>
          )}
        </AnimatePresence>
      </div>

      <p className="text-center text-sm text-base-content/60">{t.pickCategory}</p>

      {/* Catégories en bas : gros boutons faciles à toucher vite. */}
      <div className="grid grid-cols-2 gap-3">
        {puzzle.concepts.map((concept, i) => (
          <button
            key={concept.id}
            type="button"
            lang="en"
            onClick={() => classify(concept.id)}
            disabled={locked}
            className={`btn h-auto min-h-20 btn-pop py-3 font-display text-lg leading-tight ${
              TONES[i % TONES.length]
            }`}
          >
            <span className="hidden text-sm opacity-70 sm:inline" aria-hidden>
              {i + 1}
            </span>
            {concept.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex flex-col items-center gap-2">
          <p role="alert" className="text-sm text-error">
            {t.submitError}
          </p>
          <button type="button" onClick={() => submit(placements)} className="btn btn-sm">
            <RotateCcw className="size-4" aria-hidden /> {fr.lesson.retry}
          </button>
        </div>
      )}
    </div>
  );
}
