"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import {
  MAX_ACTIVE_CHALLENGES,
  MAX_PARTICIPANTS,
  challengeEndsAt,
  isChallengeOver,
} from "@/lib/challenges/challenge";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateChallengeResult =
  { ok: true; id: string } | { ok: false; reason: "limit" | "error" };

/** Lance un défi de 7 jours ; le créateur en est le premier participant. */
export async function createChallenge(): Promise<CreateChallengeResult> {
  try {
    const profile = await requireProfile();
    const admin = createAdminClient();
    const now = new Date();

    const { count, error: countError } = await admin
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", profile.id)
      .gt("ends_at", now.toISOString());
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= MAX_ACTIVE_CHALLENGES) return { ok: false, reason: "limit" };

    const { data: challenge, error } = await admin
      .from("challenges")
      .insert({ creator_id: profile.id, ends_at: challengeEndsAt(now).toISOString() })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: joinError } = await admin
      .from("challenge_participants")
      .insert({ challenge_id: challenge.id, user_id: profile.id });
    if (joinError) throw new Error(joinError.message);

    revalidatePath("/leaderboard");
    return { ok: true, id: challenge.id };
  } catch (e) {
    console.error("createChallenge :", e);
    return { ok: false, reason: "error" };
  }
}

export type JoinChallengeResult = { ok: true } | { ok: false; reason: "over" | "full" | "error" };

/** Rejoint le défi d'un ami (sans effet si on y participe déjà). */
export async function joinChallenge(id: string): Promise<JoinChallengeResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, reason: "error" };
  try {
    const profile = await requireProfile();
    const admin = createAdminClient();

    const [{ data: challenge, error }, { count }] = await Promise.all([
      admin.from("challenges").select("ends_at").eq("id", id).maybeSingle(),
      admin
        .from("challenge_participants")
        .select("user_id", { count: "exact", head: true })
        .eq("challenge_id", id),
    ]);
    if (error) throw new Error(error.message);
    if (!challenge) return { ok: false, reason: "error" };
    if (isChallengeOver(new Date(challenge.ends_at), new Date())) {
      return { ok: false, reason: "over" };
    }
    if ((count ?? 0) >= MAX_PARTICIPANTS) return { ok: false, reason: "full" };

    const { error: joinError } = await admin
      .from("challenge_participants")
      .upsert(
        { challenge_id: id, user_id: profile.id },
        { onConflict: "challenge_id,user_id", ignoreDuplicates: true },
      );
    if (joinError) throw new Error(joinError.message);

    revalidatePath(`/defi/${id}`);
    revalidatePath("/leaderboard");
    return { ok: true };
  } catch (e) {
    console.error("joinChallenge :", e);
    return { ok: false, reason: "error" };
  }
}
