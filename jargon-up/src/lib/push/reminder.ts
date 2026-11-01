/** Contenu d'une notification push (lu par public/sw.js). */
export type PushMessage = { title: string; body: string; url: string; tag: string };

export type ReminderInput = {
  notifyWord: boolean;
  notifyReviews: boolean;
  /** Mot du jour de la filière (null si aucun). */
  word: string | null;
  /** Le mot du jour a-t-il déjà été validé aujourd'hui ? */
  wordClaimed: boolean;
  /** Nombre de mots à réviser maintenant. */
  dueReviews: number;
};

/**
 * Rappel quotidien : un seul message qui combine le mot du jour et les révisions,
 * selon les préférences. Renvoie null s'il n'y a rien d'utile à dire.
 */
export function buildReminder(input: ReminderInput): PushMessage | null {
  const wantsWord = input.notifyWord && input.word !== null && !input.wordClaimed;
  const wantsReview = input.notifyReviews && input.dueReviews > 0;
  if (!wantsWord && !wantsReview) return null;

  const reviews =
    input.dueReviews > 1
      ? `${input.dueReviews} mots t'attendent en révision.`
      : "1 mot t'attend en révision.";

  if (wantsWord && wantsReview) {
    return {
      title: `Mot du jour : ${input.word}`,
      body: `Découvre-le et gagne 3 XP. Et ${reviews.charAt(0).toLowerCase()}${reviews.slice(1)}`,
      url: "/word-of-the-day",
      tag: "daily-reminder",
    };
  }
  if (wantsWord) {
    return {
      title: `Mot du jour : ${input.word}`,
      body: "Découvre sa prononciation et gagne 3 XP. Ça prend 30 secondes !",
      url: "/word-of-the-day",
      tag: "daily-reminder",
    };
  }
  return {
    title: "C'est l'heure de réviser !",
    body: `${reviews} Quelques minutes pour ne pas les oublier.`,
    url: "/review",
    tag: "daily-reminder",
  };
}
