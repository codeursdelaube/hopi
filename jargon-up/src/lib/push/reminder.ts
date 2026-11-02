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

/* ------------------------------------------------------------------------------------------
 * Relance après une absence
 * ---------------------------------------------------------------------------------------- */

/** Jours sans visite avant une relance, puis entre deux relances. */
export const INACTIVITY_DAYS = 3;
/** Au-delà, on arrête de relancer (pas de harcèlement) jusqu'au retour de l'utilisateur. */
export const MAX_INACTIVITY_PUSHES = 6;

const DAY = 86_400_000;

/**
 * Faut-il relancer cet utilisateur absent ?
 * - pas venu depuis au moins 3 jours ;
 * - pas déjà relancé dans les 3 derniers jours pendant cette absence ;
 * - moins de MAX_INACTIVITY_PUSHES relances depuis sa dernière visite.
 */
export function isInactivityDue(input: {
  lastSeenAt: Date;
  lastInactivityPushAt: Date | null;
  pushCount: number;
  now: Date;
}): boolean {
  const { lastSeenAt, lastInactivityPushAt, pushCount, now } = input;
  if (now.getTime() - lastSeenAt.getTime() < INACTIVITY_DAYS * DAY) return false;
  if (pushCount >= MAX_INACTIVITY_PUSHES) return false;
  const pushedDuringThisAbsence =
    lastInactivityPushAt !== null && lastInactivityPushAt.getTime() > lastSeenAt.getTime();
  if (
    pushedDuringThisAbsence &&
    now.getTime() - lastInactivityPushAt.getTime() < INACTIVITY_DAYS * DAY
  ) {
    return false;
  }
  return true;
}

type InactivityContext = { name: string | null; daysAway: number; dueReviews: number };

/** Messages de relance : un différent à chaque relance (dans l'ordre, puis on recommence). */
const INACTIVITY_MESSAGES: ((c: InactivityContext) => {
  title: string;
  body: string;
  url: string;
})[] = [
  (c) => ({
    title: `Ça fait ${c.daysAway} jours${c.name ? `, ${c.name}` : ""} !`,
    body:
      c.dueReviews > 0
        ? `Tu n'as pas révisé depuis ${c.daysAway} jours : ${c.dueReviews} mots t'attendent. 5 minutes suffisent.`
        : `Tu n'as pas révisé depuis ${c.daysAway} jours. Une petite séance pour garder le rythme ?`,
    url: "/review",
  }),
  () => ({
    title: "Tes mots commencent à s'envoler…",
    body: "Sans révision, on oublie vite. Viens les rattraper en quelques minutes aujourd'hui.",
    url: "/review",
  }),
  (c) => ({
    title: "Hopi a gardé ta place au chaud",
    body: `${c.name ? `${c.name}, une` : "Une"} petite leçon pour reprendre le rythme ? Hopi t'attend.`,
    url: "/learn",
  }),
  (c) => ({
    title: `Pas vu depuis ${c.daysAway} jours !`,
    body: "Ton vocabulaire pro n'attend que toi. On s'y remet ensemble ?",
    url: "/learn",
  }),
  () => ({
    title: "Ta série peut repartir aujourd'hui",
    body: "Gagne tes premiers XP de la semaine en 5 minutes et relance ta série.",
    url: "/learn",
  }),
  () => ({
    title: "Le classement bouge sans toi",
    body: "Les autres apprenants avancent. Une leçon pour revenir dans la course ?",
    url: "/leaderboard",
  }),
  () => ({
    title: "Un mot par jour, c'est déjà beaucoup",
    body: "Découvre le mot du jour de ta filière et gagne 3 XP en 30 secondes.",
    url: "/word-of-the-day",
  }),
  (c) => ({
    title: "Hopi ne lâche pas l'affaire",
    body:
      c.dueReviews > 0
        ? `${c.dueReviews} mots sont prêts à être révisés. Reviens quand tu veux, on reprend où tu t'étais arrêté.`
        : "Reviens quand tu veux : tes leçons t'attendent là où tu t'étais arrêté.",
    url: "/review",
  }),
];

/**
 * Message de la n-ième relance (n = relances déjà envoyées pendant cette absence).
 * `rotation` décale le point de départ (ex. jour de la dernière visite) : une nouvelle
 * absence ne recommence pas toujours par le même message.
 */
export function buildInactivityMessage(
  pushCount: number,
  context: InactivityContext,
  rotation = 0,
): PushMessage {
  const index = (pushCount + rotation) % INACTIVITY_MESSAGES.length;
  const message = INACTIVITY_MESSAGES[index](context);
  // Prénom seulement (et pas de nom complet) dans la notification.
  return { ...message, tag: "hopi-comeback" };
}

/** Prénom à afficher dans une notification (premier mot du nom affiché). */
export function firstName(displayName: string | null): string | null {
  const first = displayName?.trim().split(/\s+/)[0];
  return first ? first.slice(0, 20) : null;
}
