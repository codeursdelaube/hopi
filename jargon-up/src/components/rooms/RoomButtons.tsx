"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Shuffle } from "lucide-react";
import { createRoom, startRoom } from "@/app/salle/actions";
import { ShareDialog } from "@/components/share/ShareDialog";
import { ROOM, formatLimit, type OpenDuration, type TimeLimit } from "@/lib/rooms/room";
import { fr } from "@/lib/i18n/fr";

const t = fr.room;

/**
 * L'hôte choisit le temps limite de jeu et la durée d'ouverture de la salle, crée la salle,
 * partage le lien, puis arrive dans la salle pour jouer.
 */
export function CreateRoomButton() {
  const router = useRouter();
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(ROOM.defaultTimeLimit);
  const [openMinutes, setOpenMinutes] = useState<OpenDuration>(ROOM.defaultOpenDuration);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createRoom(timeLimit, openMinutes);
      if (result.ok) {
        setRoomId(result.id);
        return;
      }
      setError(
        result.reason === "limit"
          ? t.limit(ROOM.maxActive)
          : result.reason === "no_field"
            ? t.noField
            : result.reason === "no_content"
              ? t.noContent
              : t.error,
      );
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-bold">{t.timeLimit}</legend>
        <div className="grid grid-cols-4 gap-2">
          {ROOM.timeLimits.map((seconds) => (
            <label
              key={seconds}
              className={`btn btn-sm ${timeLimit === seconds ? "btn-accent" : "btn-outline"}`}
            >
              <input
                type="radio"
                name="room-time-limit"
                value={seconds}
                checked={timeLimit === seconds}
                onChange={() => setTimeLimit(seconds)}
                className="sr-only"
              />
              {formatLimit(seconds)}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-bold">{t.openDuration}</legend>
        <div className="grid grid-cols-4 gap-2">
          {ROOM.openDurations.map((minutes) => (
            <label
              key={minutes}
              className={`btn btn-sm ${openMinutes === minutes ? "btn-accent" : "btn-outline"}`}
            >
              <input
                type="radio"
                name="room-open-duration"
                value={minutes}
                checked={openMinutes === minutes}
                onChange={() => setOpenMinutes(minutes)}
                className="sr-only"
              />
              {t.openDurations[minutes]}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={create}
        disabled={pending}
        className="btn w-full btn-pop font-display text-lg btn-accent"
      >
        {pending ? (
          <span className="loading loading-spinner" aria-hidden />
        ) : (
          <Shuffle className="size-5" aria-hidden />
        )}
        {t.create}
      </button>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {roomId && (
        <ShareDialog
          title={t.shareTitle}
          text={t.shareText}
          path={`/salle/${roomId}`}
          onClose={() => {
            // Fermer AVANT de naviguer : Next garde la page quittée montée (masquée), et une
            // fenêtre restée ouverte bloquerait le défilement de la page suivante.
            setRoomId(null);
            router.push(`/salle/${roomId}`);
          }}
        />
      )}
    </div>
  );
}

/** Lance la partie (le chronomètre démarre côté serveur). */
export function StartRoomButton({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startRoom(roomId);
      if (result.ok) router.refresh();
      else
        setError(
          result.reason === "over" ? t.over : result.reason === "full" ? t.full : t.startError,
        );
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
      >
        {pending ? (
          <span className="loading loading-spinner" aria-hidden />
        ) : (
          <Play className="size-6" aria-hidden />
        )}
        {t.start}
      </button>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
