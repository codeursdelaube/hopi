import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { requireProfile } from "@/lib/auth/session";
import { DAILY_GOALS, type DailyGoal } from "@/lib/learn/options";
import { fr } from "@/lib/i18n/fr";

const t = fr.settings;

export const metadata: Metadata = { title: t.title };

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-6">
      <h1 className="font-display text-3xl font-bold">⚙️ {t.title}</h1>

      <Suspense fallback={<div className="h-96 w-full skeleton" />}>
        <SettingsLoader />
      </Suspense>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-bold">{t.field}</h2>
        <Link href="/onboarding" className="btn btn-outline">
          {t.changeField}
        </Link>
      </section>

      <section className="flex flex-col gap-2 rounded-box border-2 border-warning bg-warning/10 p-4">
        <h2 className="font-display text-xl font-bold">
          ✨ {t.premium} <span className="badge badge-warning">{fr.upgrade.soon}</span>
        </h2>
        <p className="text-sm">{t.premiumText}</p>
        <Link href="/upgrade" className="btn self-start btn-sm btn-warning">
          {t.premiumCta}
        </Link>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-bold">{t.account}</h2>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn w-full btn-outline btn-error">
            {fr.auth.signOut}
          </button>
        </form>
      </section>
    </main>
  );
}

async function SettingsLoader() {
  const profile = await requireProfile();
  const goal = (DAILY_GOALS as readonly number[]).includes(profile.daily_goal_xp)
    ? (profile.daily_goal_xp as DailyGoal)
    : 20;

  return (
    <SettingsForm
      initial={{
        displayName: profile.display_name ?? "",
        dailyGoal: goal,
        level: profile.level,
        soundEnabled: profile.sound_enabled,
      }}
    />
  );
}
