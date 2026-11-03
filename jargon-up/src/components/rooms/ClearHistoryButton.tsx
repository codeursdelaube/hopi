"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { clearRoomHistory } from "@/app/salle/actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.room;

/** « Vider l'historique », avec une confirmation sur place (pas de vidage par erreur). */
export function ClearHistoryButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function clear() {
    setError(false);
    startTransition(async () => {
      const result = await clearRoomHistory();
      if (result.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(true);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn self-start btn-ghost text-error btn-sm"
      >
        <Trash2 className="size-4" aria-hidden /> {t.clearHistory}
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={t.clearHistory}
      className="flex flex-col gap-2 rounded-box border-2 border-error/40 bg-error/5 p-3"
    >
      <p className="text-sm">{t.clearConfirm}</p>
      <div className="flex gap-2">
        <button type="button" onClick={clear} disabled={pending} className="btn btn-error btn-sm">
          {pending ? (
            <span className="loading loading-xs loading-spinner" aria-hidden />
          ) : (
            <Trash2 className="size-4" aria-hidden />
          )}
          {t.clearYes}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="btn btn-ghost btn-sm"
        >
          {t.clearNo}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {t.clearError}
        </p>
      )}
    </div>
  );
}
