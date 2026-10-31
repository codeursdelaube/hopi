"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
        <AnimatePresence mode="wait">
          <motion.div
            key={mood}
            className="chat-bubble chat-bubble-primary text-base font-semibold"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
          >
            {fr.mascot.bubbles[mood]}
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onClick={() => setIndex((i) => (i + 1) % CYCLE.length)}
        whileTap={{ scale: 0.92 }}
        className="cursor-pointer rounded-full focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
        aria-label={fr.mascot.tapHint}
      >
        <Mascot mood={mood} size={190} />
      </motion.button>
      <p className="text-sm text-base-content/60">{fr.mascot.tapHint}</p>
    </div>
  );
}
