"use client";

import { useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { Mascot, type MascotMood } from "@/components/game/Mascot";
import { fr } from "@/lib/i18n/fr";

const CYCLE: MascotMood[] = ["neutral", "happy", "sad", "proud"];

/** Hopi + bulle de dialogue ; un tap fait défiler ses humeurs. */
export function HeroMascot() {
  const [index, setIndex] = useState(0);
  const mood = CYCLE[index];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="chat-start chat max-w-xs self-center">
        {/* initial={false} : la bulle est visible dès le HTML serveur, sans attendre le JavaScript. */}
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={mood}
            className="chat-bubble chat-bubble-primary text-base font-semibold"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
          >
            {fr.mascot.bubbles[mood]}
          </m.div>
        </AnimatePresence>
      </div>

      <m.button
        type="button"
        onClick={() => setIndex((i) => (i + 1) % CYCLE.length)}
        whileTap={{ scale: 0.92 }}
        className="cursor-pointer rounded-full focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
        aria-label={fr.mascot.tapHint}
      >
        <Mascot mood={mood} size={190} />
      </m.button>
      <p className="text-sm text-base-content/60">{fr.mascot.tapHint}</p>
    </div>
  );
}
