"use client";

import { useEffect, useState, useTransition } from "react";
import { saveSettings, type SettingsInput } from "@/app/(app)/settings/actions";
import { DAILY_GOALS, LEVELS, type DailyGoal } from "@/lib/learn/options";
import { getStoredTheme, setTheme, type ThemeChoice } from "@/lib/theme";
import { fr } from "@/lib/i18n/fr";

const t = fr.settings;

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  function update<K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveSettings(values);
      setStatus(result.ok ? "saved" : "error");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t.name}</span>
        <input
          className="input w-full input-lg"
          value={values.displayName}
          maxLength={40}
          required
          placeholder={t.namePlaceholder}
          onChange={(e) => update("displayName", e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t.goal}</span>
        <select
          className="select w-full select-lg"
          value={values.dailyGoal}
          onChange={(e) => update("dailyGoal", Number(e.target.value) as DailyGoal)}
        >
          {DAILY_GOALS.map((g) => (
            <option key={g} value={g}>
              {fr.onboarding.goals[g].label} · {g} XP ({fr.onboarding.goals[g].hint})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t.level}</span>
        <select
          className="select w-full select-lg"
          value={values.level}
          onChange={(e) => update("level", e.target.value as SettingsInput["level"])}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l} · {fr.onboarding.levels[l].label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
        <span className="flex flex-col">
          <span className="font-semibold">{t.sound}</span>
          <span className="text-sm text-base-content/60">{t.soundHint}</span>
        </span>
        <input
          type="checkbox"
          className="toggle toggle-lg toggle-primary"
          checked={values.soundEnabled}
          onChange={(e) => update("soundEnabled", e.target.checked)}
        />
      </label>

      <ThemePicker />

      <button
        type="submit"
        disabled={pending}
        className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
      >
        {pending && <span className="loading loading-spinner" aria-hidden />}
        {t.save}
      </button>
      <p role="status" className={status === "error" ? "text-error" : "text-success"}>
        {status === "saved" ? t.saved : status === "error" ? t.error : ""}
      </p>
    </form>
  );
}

/** Le thème est une préférence de l'appareil : appliquée tout de suite, sans enregistrement serveur. */
function ThemePicker() {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture de localStorage (client uniquement)
    setThemeState(getStoredTheme());
  }, []);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-semibold">{t.theme}</legend>
      <div className="join w-full">
        {(Object.keys(t.themes) as ThemeChoice[]).map((choice) => (
          <input
            key={choice}
            type="radio"
            name="theme"
            className="btn join-item min-h-11 flex-1"
            aria-label={t.themes[choice]}
            checked={theme === choice}
            onChange={() => {
              setThemeState(choice);
              setTheme(choice);
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}
