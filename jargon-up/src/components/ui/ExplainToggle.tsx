"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fr } from "@/lib/i18n/fr";
import { Languages } from "lucide-react";

/** Bouton « Explication en français » qui révèle un texte avec une animation douce. */
export function ExplainToggle({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="btn self-start btn-soft btn-secondary btn-sm"
      >
        <Languages className="size-4" aria-hidden />
        {open ? fr.lesson.hideExplain : fr.lesson.explain}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <span className="block rounded-box bg-secondary/10 p-3 leading-relaxed">{text}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
