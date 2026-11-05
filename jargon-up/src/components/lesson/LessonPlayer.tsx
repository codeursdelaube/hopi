"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { Dialogue } from "@/components/exercises/Dialogue";
import { FillBlank } from "@/components/exercises/FillBlank";
import { ListenType } from "@/components/exercises/ListenType";
import { MatchPairs } from "@/components/exercises/MatchPairs";
import { MultipleChoice } from "@/components/exercises/MultipleChoice";
import { OrderWords } from "@/components/exercises/OrderWords";
import type { CheckStatus } from "@/components/exercises/types";
import { Mascot } from "@/components/game/Mascot";
import { AiExplain } from "@/components/lesson/AiExplain";
import { LessonResults } from "@/components/lesson/LessonResults";
import { correctAnswerText, isCorrect, isTypo } from "@/lib/exercises/grade";
import type { Answer, PlayableExercise } from "@/lib/exercises/schemas";
import type { FinishInput, FinishResult, FirstTryAnswer } from "@/lib/game/types";
import { playSound } from "@/lib/sound";
import { speak, unlockSpeech, warmUpSpeech } from "@/lib/speech";
import { fr } from "@/lib/i18n/fr";
import { Languages, X } from "lucide-react";

const t = fr.lesson;

type Props = {
  exercises: PlayableExercise[];
  /** Server Action appelée à la fin (leçon ou révision). */
  finish: (input: FinishInput) => Promise<FinishResult>;
  soundEnabled: boolean;
  mode?: "lesson" | "review";
  /** Bouton « Explique-moi » proposé (clé d'IA configurée, pays autorisé). */
  aiExplain?: boolean;
};

type Phase =
  | { kind: "playing" }
  | { kind: "saving" }
  | { kind: "error" }
  | { kind: "done"; result: Extract<FinishResult, { ok: true }> };

function pick<T>(list: readonly T[], n: number): T {
  return list[n % list.length];
}

export function LessonPlayer({
  exercises,
  finish,
  soundEnabled,
  mode = "lesson",
  aiExplain = false,
}: Props) {
  const router = useRouter();
  const [queue, setQueue] = useState<number[]>(() => exercises.map((_, i) => i));
  const [cursor, setCursor] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [status, setStatus] = useState<CheckStatus>("answering");
  const [showExplanation, setShowExplanation] = useState(false);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>({ kind: "playing" });
  const firstTry = useRef(new Map<string, Answer>());
  const continueRef = useRef<HTMLButtonElement>(null);

  const index = queue[cursor];
  const exercise = exercises[index];
  const isRetry = queue.indexOf(index) < cursor;

  const save = useCallback(async () => {
    setPhase({ kind: "saving" });
    const answers: FirstTryAnswer[] = [...firstTry.current].map(([exerciseId, a]) => ({
      exerciseId,
      answer: a,
    }));
    try {
      const result = await finish({ answers, offsetMinutes: new Date().getTimezoneOffset() });
      if (!result.ok) return setPhase({ kind: "error" });
      playSound("complete", soundEnabled);
      setPhase({ kind: "done", result });
    } catch {
      setPhase({ kind: "error" });
    }
  }, [finish, soundEnabled]);

  const check = useCallback(
    (a: Answer | null = answer) => {
      if (!a || status !== "answering") return;
      // Les paires sont toujours complétées jusqu'au bout : affichées comme réussies, mais les
      // erreurs comptent dans le score (la réponse envoyée au serveur contient le nombre d'erreurs).
      const ok = exercise.type === "match_pairs" || isCorrect(exercise, a);
      if (!firstTry.current.has(exercise.id)) firstTry.current.set(exercise.id, a);
      setStatus(ok ? "correct" : "wrong");
      setShowExplanation(false);
      playSound(ok ? "correct" : "wrong", soundEnabled);
      if (ok) setSolved((s) => new Set(s).add(exercise.id));
      // Exercice raté : il revient à la fin de la file.
      else setQueue((q) => [...q, index]);
      // Dictée ratée : on réentend le mot en lisant la correction.
      if (!ok && exercise.type === "listen_type") speak(exercise.payload.text);
    },
    [answer, exercise, index, soundEnabled, status],
  );

  const next = useCallback(() => {
    if (cursor + 1 >= queue.length) {
      void save();
      return;
    }
    // Exercice d'écoute suivant : on lance le mot PENDANT le toucher (sinon iOS/Android
    // peuvent bloquer ou retarder la lecture automatique).
    const upcoming = exercises[queue[cursor + 1]];
    if (upcoming.type === "listen_type") speak(upcoming.payload.text);
    setCursor((c) => c + 1);
    setAnswer(null);
    setStatus("answering");
    setShowExplanation(false);
  }, [cursor, exercises, queue, save]);

  // Voix chargées dès l'ouverture ; synthèse vocale débloquée au premier toucher.
  useEffect(() => {
    warmUpSpeech();
    window.addEventListener("pointerdown", unlockSpeech, { once: true });
    return () => window.removeEventListener("pointerdown", unlockSpeech);
  }, []);

  // Clavier : Entrée = vérifier / continuer ; 1-4 = choisir une option.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase.kind !== "playing") return;
      if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (status === "answering") check();
        else next();
      }
      const n = Number(e.key);
      if (status === "answering" && n >= 1 && n <= 4 && !(e.target instanceof HTMLInputElement)) {
        if (exercise.type === "multiple_choice" && n <= exercise.payload.options.length) {
          setAnswer({ type: "multiple_choice", index: n - 1 });
        }
        if (exercise.type === "dialogue" && n <= exercise.payload.options.length) {
          setAnswer({ type: "dialogue", index: n - 1 });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [check, exercise, next, phase.kind, status]);

  useEffect(() => {
    if (status !== "answering") continueRef.current?.focus();
  }, [status]);

  if (phase.kind === "done") {
    return (
      <LessonResults
        result={phase.result}
        mode={mode}
        onContinue={() => {
          router.push("/learn");
          router.refresh();
        }}
      />
    );
  }

  if (phase.kind === "saving" || phase.kind === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Mascot mood={phase.kind === "error" ? "sad" : "proud"} size={140} />
        {phase.kind === "saving" ? (
          <p className="flex items-center gap-2">
            <span className="loading loading-spinner" aria-hidden /> {t.saving}
          </p>
        ) : (
          <>
            <p role="alert">{t.saveError}</p>
            <button type="button" onClick={() => void save()} className="btn btn-pop btn-primary">
              {t.retry}
            </button>
          </>
        )}
      </div>
    );
  }

  const progress = solved.size / exercises.length;
  const common = {
    answer,
    onAnswer: setAnswer,
    status,
    seed: exercise.id,
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          className="btn btn-circle btn-ghost"
          aria-label={t.quit}
          onClick={() => {
            if (window.confirm(t.quitConfirm)) router.push("/learn");
          }}
        >
          <X className="size-7" strokeWidth={2.5} aria-hidden />
        </button>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-base-300"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={exercises.length}
          aria-valuenow={solved.size}
        >
          <m.div
            className="h-full rounded-full bg-success"
            initial={false}
            animate={{ width: `${Math.max(progress * 100, 3)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={cursor}
          initial={{ opacity: 0, x: 40 }}
          animate={
            status === "wrong"
              ? { opacity: 1, x: [0, -10, 10, -6, 6, 0] }
              : { opacity: 1, x: 0, scale: status === "correct" ? [1, 1.02, 1] : 1 }
          }
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: status === "answering" ? 0.2 : 0.35 }}
          className="flex flex-1 flex-col gap-4 py-4 pb-48"
        >
          {isRetry && status === "answering" && (
            <p className="badge self-start badge-soft badge-warning">{t.retryLater}</p>
          )}
          {exercise.type === "multiple_choice" && (
            <MultipleChoice payload={exercise.payload} {...common} />
          )}
          {exercise.type === "dialogue" && <Dialogue payload={exercise.payload} {...common} />}
          {exercise.type === "fill_blank" && <FillBlank payload={exercise.payload} {...common} />}
          {exercise.type === "order_words" && <OrderWords payload={exercise.payload} {...common} />}
          {exercise.type === "listen_type" && <ListenType payload={exercise.payload} {...common} />}
          {exercise.type === "match_pairs" && (
            <MatchPairs
              payload={exercise.payload}
              {...common}
              onMistake={() => playSound("wrong", soundEnabled)}
              onMatch={() => playSound("tap", soundEnabled)}
              onAnswer={(a) => {
                setAnswer(a);
                check(a);
              }}
            />
          )}
        </m.div>
      </AnimatePresence>

      <FeedbackBar
        status={status}
        canCheck={answer !== null && exercise.type !== "match_pairs"}
        onCheck={() => check()}
        onContinue={next}
        correction={
          status === "wrong" ||
          (status === "correct" && answer !== null && isTypo(exercise, answer))
            ? correctAnswerText(exercise)
            : null
        }
        correctionLabel={status === "wrong" ? t.correctAnswer : t.typo}
        explanation={exercise.explanation_fr}
        aiSlot={
          aiExplain && status === "wrong" && answer ? (
            <AiExplain
              key={cursor}
              source={mode}
              exerciseId={exercise.id}
              answer={answer}
              previousMistakes={queue.slice(0, cursor).filter((i) => i === index).length}
            />
          ) : null
        }
        showExplanation={showExplanation}
        onToggleExplanation={() => setShowExplanation((s) => !s)}
        praise={pick(t.praise, cursor)}
        encourage={pick(t.encourage, cursor)}
        continueRef={continueRef}
      />
    </div>
  );
}

type FeedbackProps = {
  status: CheckStatus;
  canCheck: boolean;
  onCheck: () => void;
  onContinue: () => void;
  correction: string | null;
  correctionLabel: string;
  explanation: string | null;
  /** « Explique-moi » (IA), affiché après une erreur. */
  aiSlot: React.ReactNode;
  showExplanation: boolean;
  onToggleExplanation: () => void;
  praise: string;
  encourage: string;
  continueRef: React.RefObject<HTMLButtonElement | null>;
};

function FeedbackBar({
  status,
  canCheck,
  onCheck,
  onContinue,
  correction,
  correctionLabel,
  explanation,
  aiSlot,
  showExplanation,
  onToggleExplanation,
  praise,
  encourage,
  continueRef,
}: FeedbackProps) {
  const answered = status !== "answering";
  const tone =
    status === "correct"
      ? "bg-success/15 border-success"
      : status === "wrong"
        ? "bg-error/15 border-error"
        : "bg-base-100 border-base-300";

  return (
    <m.div
      layout
      className={`fixed inset-x-0 bottom-0 z-30 border-t-2 ${tone} pb-[max(1rem,env(safe-area-inset-bottom))]`}
    >
      <div className="mx-auto flex play-width flex-col gap-3 px-4 pt-4">
        <AnimatePresence>
          {answered && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
              role="status"
              aria-live="assertive"
            >
              <Mascot mood={status === "correct" ? "happy" : "sad"} size={56} />
              <div className="flex flex-1 flex-col gap-1">
                <p
                  className={`font-display text-2xl font-bold ${
                    status === "correct" ? "text-success" : "text-error"
                  }`}
                >
                  {status === "correct" ? praise : encourage}
                </p>
                {correction && (
                  <p>
                    <span className="font-semibold">{correctionLabel}</span>{" "}
                    <span lang="en">{correction}</span>
                  </p>
                )}
                {explanation && (
                  <button
                    type="button"
                    onClick={onToggleExplanation}
                    aria-expanded={showExplanation}
                    className="link self-start text-sm font-semibold link-hover"
                  >
                    <Languages className="mr-1 inline size-4" aria-hidden />
                    {showExplanation ? t.hideExplain : t.explain}
                  </button>
                )}
                {aiSlot}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {answered && showExplanation && explanation && (
            <m.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden rounded-box bg-base-100 px-3 text-sm leading-relaxed"
            >
              <span className="block py-3">{explanation}</span>
            </m.p>
          )}
        </AnimatePresence>

        {answered ? (
          <button
            ref={continueRef}
            type="button"
            onClick={onContinue}
            className={`btn w-full btn-pop font-display text-lg btn-lg ${
              status === "correct" ? "btn-success" : "btn-error"
            }`}
          >
            {t.continue}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCheck}
            disabled={!canCheck}
            className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
          >
            {t.check}
          </button>
        )}
      </div>
    </m.div>
  );
}
