"use client";

import { useState, useTransition } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { Mascot } from "@/components/game/Mascot";
import { ArrowLeftIcon, FieldIcon } from "@/components/ui/icons";
import { completeOnboarding } from "@/app/(play)/onboarding/actions";
import { DAILY_GOALS, LEVELS, type DailyGoal } from "@/lib/learn/options";
import { fr } from "@/lib/i18n/fr";
import type { Level } from "@/types/database";

export type FieldOption = {
  id: string;
  slug: string;
  name_fr: string;
  is_published: boolean;
};

type Props = {
  fields: FieldOption[];
  initial: { fieldId: string | null; level: Level; dailyGoal: number };
};

const STEPS = ["field", "level", "goal"] as const;
const t = fr.onboarding;

export function OnboardingFlow({ fields, initial }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [fieldId, setFieldId] = useState(
    initial.fieldId ?? fields.find((f) => f.is_published)?.id ?? null,
  );
  const [level, setLevel] = useState<Level>(initial.level);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(
    (DAILY_GOALS as readonly number[]).includes(initial.dailyGoal)
      ? (initial.dailyGoal as DailyGoal)
      : 20,
  );
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const stepKey = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canContinue = stepKey !== "field" || fieldId !== null;

  function go(delta: number) {
    setDirection(delta);
    setStep((s) => s + delta);
  }

  function submit() {
    if (!fieldId) return;
    setFailed(false);
    startTransition(async () => {
      // En cas de succès, l'action redirige vers /learn et ne revient pas ici.
      const result = await completeOnboarding({ fieldId, level, dailyGoal });
      if (!result.ok) setFailed(true);
    });
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={step === 0 || pending}
          className="btn btn-circle btn-ghost disabled:invisible"
          aria-label={t.back}
        >
          <ArrowLeftIcon className="size-6" />
        </button>
        <progress
          className="progress h-4 flex-1 progress-primary"
          value={step + 1}
          max={STEPS.length}
          aria-label={t.stepOf(step + 1, STEPS.length)}
        />
      </div>

      <div className="flex items-end gap-3">
        <Mascot mood={failed ? "sad" : isLast ? "happy" : "neutral"} size={90} />
        <div className="chat-start chat flex-1">
          <div className="chat-bubble font-semibold" aria-live="polite">
            {t.steps[stepKey].bubble}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <m.fieldset
          key={stepKey}
          custom={direction}
          initial={{ opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -40 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3"
        >
          <legend className="mb-3 font-display text-2xl font-bold">
            {t.steps[stepKey].question}
          </legend>

          {stepKey === "field" &&
            fields.map((f) => (
              <Choice
                key={f.id}
                name="field"
                checked={fieldId === f.id}
                disabled={!f.is_published}
                onChange={() => setFieldId(f.id)}
                icon={<FieldIcon slug={f.slug} className="size-6" />}
                label={f.name_fr}
                badge={f.is_published ? undefined : fr.landing.comingSoon}
              />
            ))}

          {stepKey === "level" &&
            LEVELS.map((l) => (
              <Choice
                key={l}
                name="level"
                checked={level === l}
                onChange={() => setLevel(l)}
                icon={l}
                label={t.levels[l].label}
                hint={t.levels[l].hint}
              />
            ))}

          {stepKey === "goal" &&
            DAILY_GOALS.map((g) => (
              <Choice
                key={g}
                name="goal"
                checked={dailyGoal === g}
                onChange={() => setDailyGoal(g)}
                icon={`${g}`}
                label={t.goals[g].label}
                hint={`${t.goals[g].hint} · ${g} XP`}
              />
            ))}
        </m.fieldset>
      </AnimatePresence>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        {failed && (
          <p role="alert" className="text-center text-sm text-error">
            {t.error}
          </p>
        )}
        <button
          type="button"
          disabled={!canContinue || pending}
          onClick={isLast ? submit : () => go(1)}
          className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
        >
          {pending && <span className="loading loading-md loading-spinner" aria-hidden />}
          {pending ? t.saving : isLast ? t.finish : t.next}
        </button>
      </div>
    </div>
  );
}

type ChoiceProps = {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  badge?: string;
};

/** Grande carte radio, façon jeu (vraie case radio pour le clavier et les lecteurs d'écran). */
function Choice({ name, checked, disabled, onChange, icon, label, hint, badge }: ChoiceProps) {
  return (
    <label
      className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-box border-2 px-4 py-3 transition-colors has-focus-visible:outline-4 has-focus-visible:outline-primary/40 ${
        checked
          ? "border-primary bg-primary/10 shadow-[0_4px_0_0_var(--color-primary)]"
          : "border-base-300 shadow-[0_4px_0_0_var(--color-base-300)] hover:bg-base-200"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-field bg-base-200 font-display text-lg font-bold"
        aria-hidden
      >
        {icon}
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-display text-lg font-semibold">{label}</span>
        {hint && <span className="text-sm text-base-content/60">{hint}</span>}
      </span>
      {badge && <span className="badge badge-ghost">{badge}</span>}
    </label>
  );
}
