/** Contenu d'une notification push (lu par public/sw.js). */
export type PushMessage = { title: string; body: string; url: string; tag: string };

/** Heures proposées pour les rappels (heures locales). */
export const REMINDER_HOUR_CHOICES = [7, 9, 12, 14, 17, 18, 19, 20, 21, 22] as const;
export const MAX_REMINDER_HOURS = 4;

/**
 * Est-ce l'heure d'un rappel pour cet utilisateur ?
 * - l'heure LOCALE (d'après son décalage horaire) fait partie de ses heures choisies ;
 * - et aucun rappel n'a été envoyé dans les 50 dernières minutes (pas de doublon si la
 *   tâche planifiée tourne deux fois dans la même heure).
 */
export function isReminderDue(input: {
  reminderHours: readonly number[];
  offsetMinutes: number;
  now: Date;
  lastReminderAt: Date | null;
}): boolean {
  const localHour = new Date(input.now.getTime() - input.offsetMinutes * 60_000).getUTCHours();
  if (!input.reminderHours.includes(localHour)) return false;
  if (input.lastReminderAt && input.now.getTime() - input.lastReminderAt.getTime() < 50 * 60_000) {
    return false;
  }
  return true;
}

export type ReminderInput = {
  notifyWord: boolean;
  notifyReviews: boolean;
  /** Mot du jour de la filière (null si aucun). */
  word: string | null;
  /** Le mot du jour a-t-il déjà été validé aujourd'hui ? */
  wordClaimed: boolean;
  /** Mots à réviser maintenant. */
  dueReviews: number;
  /** Mots déjà appris (0 = l'utilisateur n'a encore fini aucune leçon). */
  learnedWords: number;
};

const TAG = "hopi-reminder";

/**
 * Message du rappel envoyé à l'heure choisie. Renvoie null si l'utilisateur
 * a coupé les deux types de rappels (ou s'il n'y a vraiment rien à proposer).
 */
export function buildReminder(input: ReminderInput): PushMessage | null {
  const wantsWord = input.notifyWord && input.word !== null && !input.wordClaimed;
  const wantsReview = input.notifyReviews;
  if (!wantsWord && !wantsReview) return null;

  const wordLine = wantsWord ? ` Et le mot du jour : « ${input.word} ».` : "";

  if (wantsReview && input.dueReviews > 0) {
    const n = input.dueReviews;
    return {
      title: "C'est l'heure de réviser !",
      body: `${n > 1 ? `${n} mots t'attendent` : "1 mot t'attend"} pour ne pas les oublier.${wordLine}`,
      url: "/review",
      tag: TAG,
    };
  }

  if (wantsReview && input.learnedWords === 0) {
    return {
      title: "C'est l'heure d'apprendre !",
      body: `Fais ta première leçon : 5 minutes suffisent.${wordLine}`,
      url: "/learn",
      tag: TAG,
    };
  }

  if (wantsWord) {
    return {
      title: `Mot du jour : ${input.word}`,
      body: wantsReview
        ? "Découvre-le (+3 XP), puis entraîne-toi 5 minutes sur tes mots."
        : "Découvre sa prononciation et gagne 3 XP. Ça prend 30 secondes !",
      url: "/word-of-the-day",
      tag: TAG,
    };
  }

  return {
    title: "C'est l'heure de ta révision !",
    body: "Entraîne-toi 5 minutes sur les mots que tu as appris.",
    url: "/review",
    tag: TAG,
  };
}
