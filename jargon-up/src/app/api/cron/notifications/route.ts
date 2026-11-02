import { NextResponse, type NextRequest } from "next/server";
import {
  buildInactivityMessage,
  buildReminder,
  firstName,
  isInactivityDue,
  isReminderDue,
} from "@/lib/push/reminder";
import { sendPush } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWordOfDay, wordDay } from "@/lib/words/daily";

/**
 * Rappels de révision et du mot du jour, à l'heure choisie par chaque utilisateur, et
 * relance (message varié) des utilisateurs absents depuis 3 jours.
 *
 * Appelée toutes les heures par Supabase (pg_cron, voir supabase/setup/hourly-reminders.sql)
 * et une fois par jour par Vercel Cron (vercel.json) en secours. Seuls les utilisateurs dont
 * c'est l'heure LOCALE reçoivent un rappel, et jamais deux fois dans la même heure.
 * Requiert `Authorization: Bearer <CRON_SECRET>` : toute autre requête est refusée.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (subs.length === 0) return NextResponse.json({ due: 0, sent: 0 });

  const ids = [...new Set(subs.map((s) => s.user_id))];
  const base =
    "id, display_name, field_id, notify_word_of_day, notify_reviews, reminder_hours, tz_offset_minutes, last_reminder_at";
  const full = await admin
    .from("profiles")
    .select(`${base}, last_seen_at, last_inactivity_push_at, inactivity_push_count`)
    .in("id", ids);
  // Migration « inactivity_nudges » pas encore appliquée : les rappels continuent sans relances.
  const fallback = full.error ? await admin.from("profiles").select(base).in("id", ids) : null;
  if (fallback?.error) {
    return NextResponse.json({ error: fallback.error.message }, { status: 500 });
  }
  const nowIso = now.toISOString();
  const profiles =
    full.data ??
    (fallback?.data ?? []).map((p) => ({
      ...p,
      last_seen_at: nowIso, // « vu à l'instant » : aucune relance d'absence
      last_inactivity_push_at: null,
      inactivity_push_count: 0,
    }));

  // Seulement ceux dont c'est l'heure.
  const dueProfiles = profiles.filter((p) =>
    isReminderDue({
      reminderHours: p.reminder_hours,
      offsetMinutes: p.tz_offset_minutes,
      now,
      lastReminderAt: p.last_reminder_at ? new Date(p.last_reminder_at) : null,
    }),
  );
  if (dueProfiles.length === 0) return NextResponse.json({ due: 0, sent: 0 });
  const userIds = dueProfiles.map((p) => p.id);

  const [{ data: terms }, { data: reviews }, { data: claims }] = await Promise.all([
    admin.from("terms").select("id, field_id"),
    admin.from("term_reviews").select("user_id, term_id, next_review_at").in("user_id", userIds),
    admin
      .from("xp_events")
      .select("user_id")
      .in("user_id", userIds)
      .eq("source", "word_of_day")
      .gte("created_at", `${wordDay(now)}T00:00:00Z`),
  ]);

  const fieldOfTerm = new Map((terms ?? []).map((t) => [t.id, t.field_id]));
  const claimed = new Set((claims ?? []).map((c) => c.user_id));

  // Un mot du jour par filière (et non par utilisateur).
  const words = new Map<string, string | null>();
  for (const fieldId of new Set(dueProfiles.flatMap((p) => (p.field_id ? [p.field_id] : [])))) {
    words.set(fieldId, (await getWordOfDay(fieldId, admin))?.term ?? null);
  }

  let sent = 0;
  const reminded: string[] = [];
  const comebacks: { id: string; count: number }[] = [];
  for (const profile of dueProfiles) {
    // Seulement les mots de la filière actuelle.
    const mine = (reviews ?? []).filter(
      (r) => r.user_id === profile.id && fieldOfTerm.get(r.term_id) === profile.field_id,
    );
    const dueReviews = mine.filter((r) => new Date(r.next_review_at) <= now).length;
    const lastSeenAt = new Date(profile.last_seen_at);

    // Absent depuis 3 jours ou plus : message de relance (varié) à la place du rappel habituel.
    const comeback =
      profile.notify_reviews &&
      isInactivityDue({
        lastSeenAt,
        lastInactivityPushAt: profile.last_inactivity_push_at
          ? new Date(profile.last_inactivity_push_at)
          : null,
        pushCount: profile.inactivity_push_count,
        now,
      });

    const message = comeback
      ? buildInactivityMessage(
          profile.inactivity_push_count,
          {
            name: firstName(profile.display_name),
            daysAway: Math.floor((now.getTime() - lastSeenAt.getTime()) / 86_400_000),
            dueReviews,
          },
          Math.floor(lastSeenAt.getTime() / 86_400_000),
        )
      : buildReminder({
          notifyWord: profile.notify_word_of_day,
          notifyReviews: profile.notify_reviews,
          word: profile.field_id ? (words.get(profile.field_id) ?? null) : null,
          wordClaimed: claimed.has(profile.id),
          dueReviews,
          learnedWords: mine.length,
        });
    if (!message) continue;

    reminded.push(profile.id);
    if (comeback) comebacks.push({ id: profile.id, count: profile.inactivity_push_count });
    sent += await sendPush(
      subs.filter((s) => s.user_id === profile.id),
      message,
    );
  }

  if (reminded.length > 0) {
    await admin.from("profiles").update({ last_reminder_at: now.toISOString() }).in("id", reminded);
  }
  await Promise.all(
    comebacks.map((c) =>
      admin
        .from("profiles")
        .update({ last_inactivity_push_at: now.toISOString(), inactivity_push_count: c.count + 1 })
        .eq("id", c.id),
    ),
  );

  return NextResponse.json({ due: dueProfiles.length, sent });
}
