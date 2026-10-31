"use client";

import { useEffect, useState } from "react";
import { getStoredTheme, setTheme } from "@/lib/theme";
import { fr } from "@/lib/i18n/fr";

function systemIsDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** Bascule rapide clair ⇄ sombre (le choix « Comme le téléphone » reste dans les réglages). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = getStoredTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- thème lu côté client uniquement
    setDark(stored === "dark" || (stored === "system" && systemIsDark()));
  }, []);

  const label = dark ? fr.settings.toLight : fr.settings.toDark;

  return (
    <button
      type="button"
      onClick={() => {
        const next = !dark;
        setDark(next);
        setTheme(next ? "dark" : "light");
      }}
      aria-label={label}
      title={label}
      className={`btn btn-circle btn-ghost text-xl ${dark === null ? "invisible" : ""} ${className}`}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
