"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Mascot } from "@/components/game/Mascot";
import { CheckIcon, LockIcon, StarIcon } from "@/components/ui/icons";
import type { LessonState, PathLesson, PathUnit } from "@/lib/learn/path";
import { fr } from "@/lib/i18n/fr";

const t = fr.learn;

/** Décalage horizontal (px) des pastilles pour dessiner un chemin qui serpente. */
const ZIGZAG = [0, 44, 66, 44, 0, -44, -66, -44];

/** Couleurs des bannières d'unité, en alternance (classes écrites en entier pour Tailwind). */
const UNIT_COLORS = [
  "bg-primary text-primary-content",
  "bg-secondary text-secondary-content",
  "bg-accent text-accent-content",
];

const NODE_STYLES: Record<LessonState, string> = {
  completed: "bg-warning text-warning-content [--btn-color:var(--color-warning)]",
  current: "bg-primary text-primary-content [--btn-color:var(--color-primary)]",
  available: "bg-secondary text-secondary-content [--btn-color:var(--color-secondary)]",
  locked: "bg-base-300 text-base-content/40 [--btn-color:var(--color-base-300)]",
};

export function LearnPath({ units }: { units: PathUnit[] }) {
  const current = units.flatMap((u) => u.lessons).find((l) => l.state === "current");
  let nodeIndex = 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end gap-3">
        <Mascot mood={current ? "happy" : "proud"} size={84} />
        <div className="chat-start chat flex-1">
          <div className="chat-bubble font-semibold">
            {current ? t.continueWith(current.title_en) : t.allDone}
          </div>
        </div>
      </div>

      {units.map((unit, unitIndex) => (
        <section key={unit.id} aria-labelledby={`unit-${unit.id}`} className="flex flex-col gap-8">
          <header
            className={`rounded-box p-4 shadow-[0_5px_0_0_rgb(0_0_0/0.18)] ${
              UNIT_COLORS[unitIndex % UNIT_COLORS.length]
            }`}
          >
            <p className="text-sm font-bold uppercase opacity-80">
              {t.unit(unitIndex + 1)} · {unit.level}
              {unit.skipped && ` · ${t.optional}`}
            </p>
            <h2 id={`unit-${unit.id}`} className="font-display text-xl font-bold">
              {unit.title_fr}
            </h2>
            <p className="text-sm opacity-80">
              {unit.title_en} — {t.lessonsDone(unit.completedCount, unit.lessons.length)}
            </p>
          </header>

          {/* pt-4 : laisse la place à la bulle « Commencer » au-dessus de la première pastille */}
          <ol className="flex flex-col items-center gap-6 pt-4">
            {unit.lessons.map((lesson) => {
              const offset = ZIGZAG[nodeIndex++ % ZIGZAG.length];
              return (
                <li key={lesson.id} style={{ transform: `translateX(${offset}px)` }}>
                  <LessonNode lesson={lesson} />
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

function LessonNode({ lesson }: { lesson: PathLesson }) {
  const label = t.lessonAria(lesson.title_en, t.states[lesson.state]);
  const circle = `btn-pop flex size-18 items-center justify-center rounded-full ${NODE_STYLES[lesson.state]}`;
  const icon =
    lesson.state === "completed" ? (
      <CheckIcon className="size-9" />
    ) : lesson.state === "locked" ? (
      <LockIcon className="size-8" />
    ) : (
      <StarIcon className="size-9" />
    );

  return (
    <motion.div
      className="relative flex flex-col items-center"
      whileHover={lesson.state === "locked" ? undefined : { scale: 1.06 }}
      whileTap={lesson.state === "locked" ? undefined : { scale: 0.94 }}
    >
      {lesson.state === "current" && (
        <motion.span
          className="absolute -top-11 rounded-field border-2 border-base-300 bg-base-100 px-3 py-1 font-display font-bold whitespace-nowrap text-primary"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          {t.start}
        </motion.span>
      )}

      {lesson.state === "locked" ? (
        <span className={circle} role="img" aria-label={label}>
          {icon}
        </span>
      ) : (
        <Link
          href={`/lesson/${lesson.id}`}
          aria-label={label}
          className={`${circle} focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary ${
            lesson.state === "current" ? "ring-8 ring-primary/25" : ""
          }`}
        >
          {icon}
        </Link>
      )}

      <span
        className={`mt-2 max-w-32 text-center text-sm font-semibold ${
          lesson.state === "locked" ? "text-base-content/40" : ""
        }`}
      >
        {lesson.title_en}
      </span>
    </motion.div>
  );
}
