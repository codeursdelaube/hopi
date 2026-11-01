"use client";

import { useEffect, useState } from "react";
import * as m from "motion/react-m";
import { animate } from "motion/react";
import { Confetti } from "@/components/game/Confetti";
import { Mascot } from "@/components/game/Mascot";
import type { FinishResult } from "@/lib/game/types";
import { scorePercent } from "@/lib/gamification/xp";
import { fr } from "@/lib/i18n/fr";
import { Flame, Star, Target } from "lucide-react";
import { BadgeIcon } from "@/components/ui/icons";

const t = fr.lesson.results;

type Props = {
  result: Extract<FinishResult, { ok: true }>;
  mode: "lesson" | "review";
  onContinue: () => void;
};

/** Compteur qui défile de 0 à la valeur finale. */
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);
  return <>{display}</>;
}

export function LessonResults({ result, mode, onContinue }: Props) {
  const { summary } = result;
  const accuracy = scorePercent(result.correct, result.total);
  const leveledUp = summary.levelAfter > summary.levelBefore;
  const goalReached = summary.todayXp >= summary.dailyGoal;

  const stats = [
    {
      label: t.xp,
      value: (
        <>
          +<CountUp value={summary.xpGained} />
        </>
      ),
      tone: "border-warning text-warning",
    },
    {
      label: t.accuracy,
      value: (
        <>
          <CountUp value={accuracy} /> %
        </>
      ),
      tone: "border-success text-success",
    },
    {
      label: t.streak,
      value: (
        <span className="inline-flex items-center gap-1">
          <Flame className="size-6" aria-hidden /> {summary.streak}
        </span>
      ),
      tone: "border-secondary text-secondary",
    },
  ];

  return (
    <div className="flex flex-1 flex-col items-center gap-6 py-6 text-center">
      <Confetti />
      <m.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 12 }}
      >
        <Mascot mood={accuracy >= 80 ? "proud" : "happy"} size={170} />
      </m.div>

      <h1 className="font-display text-3xl font-bold text-warning">
        {mode === "review" ? t.reviewTitle : t.title}
      </h1>

      <div className="grid w-full grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <m.div
            key={s.label}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className={`flex flex-col overflow-hidden rounded-box border-2 ${s.tone}`}
          >
            <span className="bg-current/15 py-1 text-xs font-bold uppercase">{s.label}</span>
            <span className="py-3 font-display text-2xl font-bold">{s.value}</span>
          </m.div>
        ))}
      </div>

      <div className="flex w-full flex-col gap-2">
        {summary.streakIncreased && (
          <Banner>
            <Flame className="size-5 text-secondary" aria-hidden /> {t.streakUp}
          </Banner>
        )}
        {leveledUp && (
          <Banner>
            <Star className="size-5 text-warning" fill="currentColor" aria-hidden />{" "}
            {t.levelUp(summary.levelAfter)}
          </Banner>
        )}
        {summary.newBadges.map((b) => (
          <Banner key={b.slug}>
            <BadgeIcon slug={b.slug} className="size-5 text-warning" /> {t.newBadge}{" "}
            <strong>{b.name_fr}</strong>
          </Banner>
        ))}
        {result.capped && <p className="text-sm text-base-content/60">{t.capReached}</p>}
        <div className="flex flex-col gap-1 pt-2">
          <p className="text-sm font-semibold">
            {goalReached ? (
              <span className="inline-flex items-center gap-1">
                <Target className="size-4 text-warning" aria-hidden /> {t.goalReached}
              </span>
            ) : (
              t.goal(summary.todayXp, summary.dailyGoal)
            )}
          </p>
          <progress
            className="progress h-3 w-full progress-warning"
            value={Math.min(summary.todayXp, summary.dailyGoal)}
            max={summary.dailyGoal}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="btn mt-auto w-full btn-pop font-display text-lg btn-lg btn-primary"
        autoFocus
      >
        {fr.lesson.continue}
      </button>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <m.p
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.8, type: "spring" }}
      className="flex items-center justify-center gap-2 rounded-box bg-primary/10 px-4 py-2 font-semibold"
    >
      {children}
    </m.p>
  );
}
