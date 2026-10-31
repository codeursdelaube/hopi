import type { Answer } from "@/lib/exercises/schemas";

export type CheckStatus = "answering" | "correct" | "wrong";

/** Props communes : le joueur de leçon garde la réponse en cours (`answer`). */
export type ExerciseProps<P> = {
  payload: P;
  answer: Answer | null;
  onAnswer: (answer: Answer | null) => void;
  status: CheckStatus;
  /** Graine stable pour mélanger l'affichage (identique côté serveur et client). */
  seed: string;
};

/** Style d'une option selon son état (sélectionnée, bonne, fausse). */
export function optionClass({
  selected,
  isAnswer,
  status,
}: {
  selected: boolean;
  isAnswer: boolean;
  status: CheckStatus;
}): string {
  const base =
    "flex min-h-14 w-full items-center gap-3 rounded-box border-2 px-4 py-3 text-left text-base font-semibold transition-colors";
  if (status !== "answering" && isAnswer) {
    return `${base} border-success bg-success/15 shadow-[0_4px_0_0_var(--color-success)]`;
  }
  if (status === "wrong" && selected) {
    return `${base} border-error bg-error/15 shadow-[0_4px_0_0_var(--color-error)]`;
  }
  if (selected) {
    return `${base} border-primary bg-primary/10 shadow-[0_4px_0_0_var(--color-primary)]`;
  }
  return `${base} border-base-300 shadow-[0_4px_0_0_var(--color-base-300)] hover:bg-base-200 active:translate-y-1 active:shadow-none`;
}
