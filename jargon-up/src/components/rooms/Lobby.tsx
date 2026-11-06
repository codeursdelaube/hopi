"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Hourglass, Play } from "lucide-react";
import { launchRoom, setRoomReady } from "@/app/salle/actions";
import { PlayerAvatar } from "@/components/rooms/PlayerAvatar";
import { ShareButton } from "@/components/share/ShareDialog";
import { lobbyStatus, type LobbyPlayer } from "@/lib/rooms/room";
import { fr } from "@/lib/i18n/fr";

const t = fr.room;

type Props = {
  roomId: string;
  meId: string;
  hostId: string;
  hostName: string;
  /** Prénoms déjà prêts à afficher. */
  players: LobbyPlayer[];
};

/**
 * Salle d'attente : chacun indique qu'il est prêt, l'hôte voit la liste et lance la partie pour
 * tout le monde. Le serveur revérifie tout : le bouton désactivé n'est qu'une aide.
 */
export function Lobby({ roomId, meId, hostId, hostName, players }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isHost = meId === hostId;
  const status = lobbyStatus(players, hostId);
  const iAmReady = players.find((p) => p.userId === meId)?.ready ?? false;
  // L'hôte d'abord, puis les joueurs prêts.
  const sorted = [...players].sort(
    (a, b) =>
      Number(b.userId === hostId) - Number(a.userId === hostId) ||
      Number(b.ready) - Number(a.ready),
  );

  function toggleReady() {
    setError(null);
    startTransition(async () => {
      const result = await setRoomReady(roomId, !iAmReady);
      if (!result.ok) setError(t.actionError);
      router.refresh();
    });
  }

  function launch() {
    setError(null);
    startTransition(async () => {
      const result = await launchRoom(roomId);
      if (!result.ok) {
        setError(
          result.reason === "not_enough"
            ? t.needPlayers
            : result.reason === "closed"
              ? t.expired
              : result.reason === "error"
                ? t.actionError
                : null,
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <section className="flex flex-col gap-2 text-left">
        <h2 className="font-display text-lg font-bold">{t.lobby}</h2>
        <ul className="flex flex-col gap-2">
          {sorted.map((player) => (
            <li
              key={player.userId}
              className={`flex items-center gap-3 rounded-box border-2 px-3 py-2 ${
                player.ready ? "border-success/50 bg-success/5" : "border-base-300"
              }`}
            >
              <PlayerAvatar url={player.avatarUrl} />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {player.name}
                {player.userId === meId && (
                  <span className="ml-2 badge badge-sm badge-primary">{t.you}</span>
                )}
                {player.userId === hostId && (
                  <span className="ml-2 badge gap-1 badge-sm badge-warning">
                    <Crown className="size-3" aria-hidden /> {t.host}
                  </span>
                )}
              </span>
              {player.ready ? (
                <span className="flex items-center gap-1 text-sm font-bold text-success">
                  <Check className="size-4" strokeWidth={3} aria-hidden /> {t.ready}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-base-content/60">
                  <Hourglass className="size-4" aria-hidden /> {t.notReady}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isHost ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={launch}
            disabled={pending || !status.canLaunch}
            className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
          >
            {pending ? (
              <span className="loading loading-spinner" aria-hidden />
            ) : (
              <Play className="size-6" aria-hidden />
            )}
            {t.launch(status.participants)}
          </button>
          {!status.canLaunch ? (
            <p className="text-sm text-base-content/70">{t.needPlayers}</p>
          ) : status.readyOthers < status.others ? (
            <p className="text-sm text-base-content/70">
              {t.notAllReady(status.readyOthers, status.others)}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p role="status" className="text-sm text-base-content/70">
            {iAmReady ? t.waitingHost(hostName) : t.getReady}
          </p>
          <button
            type="button"
            onClick={toggleReady}
            disabled={pending}
            className={`btn w-full btn-pop font-display text-lg btn-lg ${
              iAmReady ? "btn-outline" : "btn-primary"
            }`}
          >
            {pending ? (
              <span className="loading loading-spinner" aria-hidden />
            ) : (
              !iAmReady && <Check className="size-6" strokeWidth={3} aria-hidden />
            )}
            {iAmReady ? t.notYet : t.iAmReady}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      <p className="text-sm text-base-content/60">{t.xpRule}</p>
      <ShareButton
        title={t.shareTitle}
        text={t.shareText}
        path={`/salle/${roomId}`}
        label={t.inviteMore}
        className="btn w-full btn-outline"
      />
    </div>
  );
}
