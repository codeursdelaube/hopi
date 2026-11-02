"use client";

import { useState, useTransition } from "react";
import { Swords } from "lucide-react";
import { createChallenge, joinChallenge } from "@/app/defi/actions";
import { ShareDialog } from "@/components/share/ShareDialog";
import { MAX_ACTIVE_CHALLENGES } from "@/lib/challenges/challenge";
import { fr } from "@/lib/i18n/fr";

const t = fr.challenge;

/** Crée un défi puis ouvre directement la fenêtre de partage avec son lien. */
export function LaunchChallengeButton() {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function launch() {
    setError(null);
    startTransition(async () => {
      const result = await createChallenge();
      if (result.ok) setChallengeId(result.id);
      else setError(result.reason === "limit" ? t.limit(MAX_ACTIVE_CHALLENGES) : t.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={launch}
        disabled={pending}
        className="btn w-full btn-pop font-display text-lg btn-secondary"
      >
        {pending ? (
          <span className="loading loading-spinner" aria-hidden />
        ) : (
          <Swords className="size-5" aria-hidden />
        )}
        {t.launch}
      </button>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {challengeId && (
        <ShareDialog
          title={t.shareTitle}
          text={fr.share.challengeText}
          path={`/defi/${challengeId}`}
          onClose={() => setChallengeId(null)}
        />
      )}
    </div>
  );
}

/** Rejoint le défi d'un ami (utilisateur connecté). La page se met à jour après l'action. */
export function JoinChallengeButton({ challengeId }: { challengeId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function join() {
    setError(null);
    startTransition(async () => {
      const result = await joinChallenge(challengeId);
      if (!result.ok) {
        setError(
          result.reason === "over" ? t.over : result.reason === "full" ? t.full : t.joinError,
        );
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={join}
        disabled={pending}
        className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
      >
        {pending ? (
          <span className="loading loading-spinner" aria-hidden />
        ) : (
          <Swords className="size-5" aria-hidden />
        )}
        {t.accept}
      </button>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
