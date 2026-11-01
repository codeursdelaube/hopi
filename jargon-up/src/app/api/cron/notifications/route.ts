import { NextResponse, type NextRequest } from "next/server";
import { buildReminder } from "@/lib/push/reminder";
import { sendPush } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWordOfDay, wordDay } from "@/lib/words/daily";

/**
 * Rappel quotidien (mot du jour + révisions), appelé par Vercel Cron (voir vercel.json).
 * Vercel envoie `Authorization: Bearer <CRON_SECRET>` : toute autre requête est refusée.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (subs.length === 0) return NextResponse.json({ users: 0, sent: 0 });

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const now = new Date().toISOString();
  const dayStart = `${wordDay()}T00:00:00Z`;

  const [{ data: profiles }, { data: due }, { data: claims }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, field_id, notify_word_of_day, notify_reviews")
      .in("id", userIds),
    admin.from("term_reviews").select("user_id").in("user_id", userIds).lte("next_review_at", now),
    admin
      .from("xp_events")
      .select("user_id")
      .in("user_id", userIds)
      .eq("source", "word_of_day")
      .gte("created_at", dayStart),
  ]);

  const dueByUser = new Map<string, number>();
  for (const r of due ?? []) dueByUser.set(r.user_id, (dueByUser.get(r.user_id) ?? 0) + 1);
  const claimed = new Set((claims ?? []).map((c) => c.user_id));

  // Un mot du jour par filière (et non par utilisateur).
  const words = new Map<string, string | null>();
  for (const fieldId of new Set(
    (profiles ?? []).flatMap((p) => (p.field_id ? [p.field_id] : [])),
  )) {
    words.set(fieldId, (await getWordOfDay(fieldId, admin))?.term ?? null);
  }

  let sent = 0;
  let users = 0;
  for (const profile of profiles ?? []) {
    const message = buildReminder({
      notifyWord: profile.notify_word_of_day,
      notifyReviews: profile.notify_reviews,
      word: profile.field_id ? (words.get(profile.field_id) ?? null) : null,
      wordClaimed: claimed.has(profile.id),
      dueReviews: dueByUser.get(profile.id) ?? 0,
    });
    if (!message) continue;
    users++;
    sent += await sendPush(
      subs.filter((s) => s.user_id === profile.id),
      message,
    );
  }

  return NextResponse.json({ users, sent });
}
