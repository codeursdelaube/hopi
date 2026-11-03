"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { awardXp, xpEarnedToday } from "@/lib/game/engine";
import { lessonsWithTerms } from "@/lib/rooms/load";
import {
  ROOM,
  ROOM_XP,
  buildPuzzle,
  gradePlacements,
  isTimeLimit,
  puzzleSchema,
  roomXp,
  timedScore,
} from "@/lib/rooms/room";
import { createAdminClient } from "@/lib/supabase/admin";

/** Délai de grâce après la fermeture pour valider une partie déjà commencée. */
const GRACE_MS = 60 * 60 * 1000;

export type CreateRoomResult =
  { ok: true; id: string } | { ok: false; reason: "limit" | "no_field" | "no_content" | "error" };

/**
 * Crée une salle « Tri express » avec un puzzle tiré dans la filière du créateur, et le temps
 * limite choisi par l'hôte (parmi les durées proposées).
 */
export async function createRoom(timeLimit: number): Promise<CreateRoomResult> {
  if (!isTimeLimit(timeLimit)) return { ok: false, reason: "error" };
  try {
    const profile = await requireProfile();
    if (!profile.field_id) return { ok: false, reason: "no_field" };
    const admin = createAdminClient();
    const now = new Date();

    const { count, error: countError } = await admin
      .from("challenge_rooms")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", profile.id)
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
        ends_at: new Date(now.getTime() + ROOM.hours * 3_600_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath("/leaderboard");
    return { ok: true, id: room.id };
  } catch (e) {
    console.error("createRoom :", e);
    return { ok: false, reason: "error" };
  }
}

export type StartRoomResult = { ok: true } | { ok: false; reason: "over" | "full" | "error" };

/** Démarre la partie du joueur : le chronomètre part ici, côté serveur (pas de remise à zéro). */
export async function startRoom(id: string): Promise<StartRoomResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, reason: "error" };
  try {
    const profile = await requireProfile();
    const admin = createAdminClient();
    const [{ data: room, error }, { count }] = await Promise.all([
      admin.from("challenge_rooms").select("ends_at").eq("id", id).maybeSingle(),
      admin
        .from("challenge_room_players")
        .select("user_id", { count: "exact", head: true })
        .eq("room_id", id),
    ]);
    if (error) throw new Error(error.message);
    if (!room) return { ok: false, reason: "error" };
    if (Date.now() >= new Date(room.ends_at).getTime()) return { ok: false, reason: "over" };
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
    console.error("startRoom :", e);
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
  | { ok: false; reason: "not_started" | "already" | "over" | "error" };

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
        .select("puzzle, ends_at, time_limit_seconds")
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

    const now = new Date();
    if (now.getTime() > new Date(room.ends_at).getTime() + GRACE_MS) {
      return { ok: false, reason: "over" };
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
