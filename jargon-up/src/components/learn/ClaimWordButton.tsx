"use client";

import { useState, useTransition } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { claimWordOfDay } from "@/app/(app)/word-of-the-day/actions";
import { Confetti } from "@/components/game/Confetti";
import { playSound } from "@/lib/sound";
import { fr } from "@/lib/i18n/fr";

export function ClaimWordButton({
  alreadyClaimed,
  soundEnabled,
}: {
  alreadyClaimed: boolean;
  soundEnabled: boolean;
}) {
  const [claimed, setClaimed] = useState(alreadyClaimed);
  const [gained, setGained] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function claim() {
    setFailed(false);
    startTransition(async () => {
      const result = await claimWordOfDay(new Date().getTimezoneOffset());
      if (!result.ok) return setFailed(true);
      playSound("complete", soundEnabled);
      setGained(result.summary.xpGained);
      setClaimed(true);
    });
  }

  if (claimed) {
    return (
      <div className="flex flex-col items-center gap-2">
        {gained !== null && <Confetti count={40} />}
        <p className="btn btn-disabled w-full btn-lg">{fr.word.claimed}</p>
        <AnimatePresence>
          {gained !== null && (
            <m.p
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-xl font-bold text-warning"
              role="status"
            >
              {fr.word.claimSuccess(gained)}
            </m.p>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={claim}
        disabled={pending}
        className="btn w-full btn-pop font-display text-lg btn-lg btn-warning"
      >
        {pending && <span className="loading loading-spinner" aria-hidden />}
        {fr.word.claim}
      </button>
      {failed && (
        <p role="alert" className="text-center text-sm text-error">
          {fr.word.claimError}
        </p>
      )}
    </div>
  );
}
