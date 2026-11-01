import { Suspense } from "react";
import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.onboarding.title };

export default function OnboardingPage() {
  return (
    <div className="flex flex-1 flex-col py-6">
      <Suspense fallback={<div className="h-96 w-full skeleton" />}>
        <OnboardingLoader />
      </Suspense>
    </div>
  );
}

async function OnboardingLoader() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: fields, error } = await supabase
    .from("fields")
    .select("id, slug, name_fr, is_published")
    .order("is_published", { ascending: false })
    .order("name_fr");
  if (error) throw new Error(`Chargement des filières : ${error.message}`);

  return (
    <OnboardingFlow
      fields={fields}
      initial={{
        fieldId: profile.field_id,
        level: profile.level,
        dailyGoal: profile.daily_goal_xp,
      }}
    />
  );
}
