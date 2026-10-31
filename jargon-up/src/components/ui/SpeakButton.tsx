"use client";

import { speak } from "@/lib/speech";

/** Bouton « haut-parleur » qui prononce un texte en anglais. */
export function SpeakButton({
  text,
  label,
  className = "btn-circle btn-primary",
}: {
  text: string;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={label}
      className={`btn btn-pop ${className}`}
    >
      🔊
    </button>
  );
}
