"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { awardXp, xpEarnedToday } from "@/lib/game/engine";
import { historyRoomIds, lessonsWithTerms } from "@/lib/rooms/load";
import {
  ROOM,
  ROOM_XP,
  buildPuzzle,
  gradePlacements,
  isOpenDuration,
  isRoomJoinable,
  isTimeLimit,
  puzzleSchema,
  roomXp,
  timedScore,
} from "@/lib/rooms/room";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateRoomResult =
  { ok: true; id: string } | { ok: false; reason: "limit" | "no_field" | "no_content" | "error" };

/**
 * Crée une salle « Tri express » avec un puzzle tiré dans la filière du créateur. L'hôte
 * choisit le temps limite de jeu et combien de temps la salle attend les joueurs (parmi les
 * valeurs proposées) ; sans lancement à temps, elle ferme et reste dans l'historique.
 */
export async function createRoom(
  timeLimit: number,
  openMinutes: number = ROOM.defaultOpenDuration,
): Promise<CreateRoomResult> {
  if (!isTimeLimit(timeLimit) || !isOpenDuration(openMinutes)) {
    return { ok: false, reason: "error" };
  }
  try {
    const profile = await requireProfile();
    if (!profile.field_id) return { ok: false, reason: "no_field" };
    const admin = createAdminClient();
    const now = new Date();

    const { count, error: countError } = await admin
      .from("challenge_rooms")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", profile.id)
      .is("started_at", null)
      .gt("ends_at", now.toISOString());
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= ROOM.maxActive) return { ok: false, reason: "limit" };

    const puzzle = buildPuzzle(await lessonsWithTerms(profile.field_id));
    if (!puzzle) return { ok: false, reason: "no_content" };

    const { data: room, error } = await admin
      .from("challenge_rooms")
      .insert({
        creator_id: profile.id,
        field_id: profile.field_id,
        puzzle,
        time_limit_seconds: timeLimit,
        ends_at: new Date(now.getTime() + openMinutes * 60_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // L'hôte est le premier joueur de la salle d'attente, et il est prêt par définition.
    const { error: hostError } = await admin
      .from("challenge_room_players")
      .insert({ room_id: room.id, user_id: profile.id, ready: true });
    if (hostError) throw new Error(hostError.message);

    revalidatePath("/leaderboard");
    return { ok: true, id: room.id };
  } catch (e) {
    console.error("createRoom :", e);
    return { ok: false, reason: "error" };
  }
}

export type JoinRoomResult = { ok: true } | { ok: false; reason: "over" | "full" | "error" };

/** Entre dans la salle d'attente (impossible une fois la partie lancée ou la salle fermée). */
export async function joinRoom(id: string): Promise<JoinRoomResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, reason: "error" };
  try {
    const profile = await requireProfile();
    const admin = createAdminClient();
    const [{ data: room, error }, { count }] = await Promise.all([
      admin.from("challenge_rooms").select("ends_at, started_at").eq("id", id).maybeSingle(),
      admin
        .from("challenge_room_players")
        .select("user_id", { count: "exact", head: true })
        .eq("room_id", id),
    ]);
    if (error) throw new Error(error.message);
    if (!room) return { ok: false, reason: "error" };
    const startedAt = room.started_at ? new Date(room.started_at) : null;
    if (!isRoomJoinable(startedAt, new Date(room.ends_at), new Date())) {
      return { ok: false, reason: "over" };
    }
    if ((count ?? 0) >= ROOM.maxPlayers) return { ok: false, reason: "full" };

    const { error: insertError } = await admin
      .from("challenge_room_players")
      .upsert(
        { room_id: id, user_id: profile.id },
        { onConflict: "room_id,user_id", ignoreDuplicates: true },
      );
    if (insertError) throw new Error(insertError.message);

    revalidatePath(`/salle/${id}`);
    return { ok: true };
  } catch (e) {
    console.error("joinRoom :", e);
    return { ok: false, reason: "error" };
  }
}

/** « Je suis prêt » / « Pas encore », uniquement avant le lancement. */
export async function setRoomReady(id: string, ready: boolean): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(id).success) return { ok: false };
  try {
    const profile = await requireProfile();
    const admin = createAdminClient();
    const { data: room, error } = await admin
      .from("challenge_rooms")
      .select("creator_id, started_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // L'hôte est toujours prêt : c'est lui qui lance.
    if (!room || room.started_at || room.creator_id === profile.id) return { ok: false };

    const { error: updateError } = await admin
      .from("challenge_room_players")
      .update({ ready: Boolean(ready) })
      .eq("room_id", id)
      .eq("user_id", profile.id);
    if (updateError) throw new Error(updateError.message);

    revalidatePath(`/salle/${id}`);
    return { ok: true };
  } catch (e) {
    console.error("setRoomReady :", e);
    return { ok: false };
  }
}

export type LaunchRoomResult =
  { ok: true } | { ok: false; reason: "not_enough" | "already" | "closed" | "error" };

/** L'hôte lance la partie. Tout est vérifié et appliqué par la base, en une seule transaction. */
export async function launchRoom(id: string): Promise<LaunchRoomResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, reason: "error" };
  try {
    const profile = await requireProfile();
    const { data, error } = await createAdminClient().rpc("launch_challenge_room", {
      p_room_id: id,
      p_host_id: profile.id,
      p_countdown_seconds: ROOM.countdownSeconds,
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/salle/${id}`);
    if (data === "ok") return { ok: true };
    if (data === "not_enough" || data === "already" || data === "closed") {
      return { ok: false, reason: data };
    }
    return { ok: false, reason: "error" };
  } catch (e) {
    console.error("launchRoom :", e);
    return { ok: false, reason: "error" };
  }
}

const submitSchema = z.object({
  placements: z
    .array(z.object({ termId: z.string().min(1).max(64), conceptId: z.string().min(1).max(64) }))
    .max(40),
  offsetMinutes: z.number().int(),
});

export type SubmitRoomResult =
  | { ok: true; correct: number; total: number; xp: number; capped: boolean; late: boolean }
  | { ok: false; reason: "not_started" | "already" | "error" };

/** Fin de partie : correction et chronomètre côté serveur, XP plafonnés, une seule soumission. */
export async function submitRoom(id: string, raw: unknown): Promise<SubmitRoomResult> {
  const parsed = submitSchema.safeParse(raw);
  if (!z.uuid().safeParse(id).success || !parsed.success) return { ok: false, reason: "error" };
  try {
    const profile = await requireProfile();
    const admin = createAdminClient();
    const [{ data: room, error }, { data: player, error: playerError }] = await Promise.all([
      admin
        .from("challenge_rooms")
        .select("puzzle, time_limit_seconds, started_at")
        .eq("id", id)
        .maybeSingle(),
      admin
        .from("challenge_room_players")
        .select("started_at, finished_at")
        .eq("room_id", id)
        .eq("user_id", profile.id)
        .maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    if (playerError) throw new Error(playerError.message);
    if (!room) return { ok: false, reason: "error" };
    if (!player) return { ok: false, reason: "not_started" };
    if (player.finished_at) return { ok: false, reason: "already" };

    // Rien n'est accepté avant le départ commun (salle d'attente, compte à rebours). Ensuite,
    // seul le temps de jeu compte (timedScore), même si l'attente de la salle est terminée.
    const now = new Date();
    if (!room.started_at || now < new Date(room.started_at)) {
      return { ok: false, reason: "not_started" };
    }

    const puzzle = puzzleSchema.parse(room.puzzle);
    const placements = Object.fromEntries(
      parsed.data.placements.map((p) => [p.termId, p.conceptId]),
    );
    const graded = gradePlacements(puzzle, placements);
    // Chronomètre du serveur : au-delà du temps limite (plus la marge réseau), partie perdue.
    const { correct, durationMs, late } = timedScore({
      correct: graded.correct,
      elapsedMs: now.getTime() - new Date(player.started_at).getTime(),
      limitMs: room.time_limit_seconds * 1000,
    });
    const total = graded.total;
    const earned = late ? 0 : roomXp(correct, total);
    const alreadyToday = await xpEarnedToday(profile.id, parsed.data.offsetMinutes, "challenge");
    const allowed = Math.max(0, Math.min(earned, ROOM_XP.dailyCap - alreadyToday));

    // Écriture conditionnelle (finished_at encore vide) : deux envois simultanés ne
    // peuvent pas rapporter deux fois des XP.
    const { data: saved, error: saveError } = await admin
      .from("challenge_room_players")
      .update({
        finished_at: now.toISOString(),
        correct,
        total,
        duration_ms: durationMs,
        xp: allowed,
        placements,
      })
      .eq("room_id", id)
      .eq("user_id", profile.id)
      .is("finished_at", null)
      .select("room_id");
    if (saveError) throw new Error(saveError.message);
    if (saved.length === 0) return { ok: false, reason: "already" };

    if (allowed > 0) {
      await awardXp({
        userId: profile.id,
        amount: allowed,
        source: "challenge",
        offsetMinutes: parsed.data.offsetMinutes,
        perfectLesson: false,
      });
    }

    revalidatePath(`/salle/${id}`);
    return { ok: true, correct, total, xp: allowed, capped: allowed < earned, late };
  } catch (e) {
    console.error("submitRoom :", e);
    return { ok: false, reason: "error" };
  }
}

/**
 * Vide l'historique des défis de l'utilisateur : les salles sont masquées POUR LUI SEUL
 * (scores et classements restent visibles pour les autres joueurs, les XP sont conservés).
 */
export async function clearRoomHistory(): Promise<{ ok: boolean }> {
  try {
    const profile = await requireProfile();
    const ids = await historyRoomIds(profile.id);
    if (ids.length > 0) {
      const { error } = await createAdminClient()
        .from("challenge_room_hidden")
        .upsert(
          ids.map((roomId) => ({ user_id: profile.id, room_id: roomId })),
          { onConflict: "user_id,room_id", ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);
    }
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    console.error("clearRoomHistory :", e);
    return { ok: false };
  }
}
