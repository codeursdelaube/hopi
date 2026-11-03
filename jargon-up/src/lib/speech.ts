/**
 * Prononciation anglaise via la synthèse vocale du navigateur (Web Speech API).
 *
 * Pour que le son parte VITE et de façon fiable :
 * - on préfère une voix installée sur l'appareil (`localService`) : les voix « en ligne »
 *   (ex. « Google US English » sur Chrome) téléchargent l'audio, ce qui est lent en 3G ;
 * - la liste des voix est chargée à l'avance (elle arrive en retard sur Chrome) ;
 * - la lecture part TOUT DE SUITE, dans le toucher de l'utilisateur : iOS et certains Android
 *   refusent une lecture lancée plus tard (ex. dans un `setTimeout`) ;
 * - Chrome ignore parfois une lecture lancée juste après `cancel()` : on la relance une fois ;
 * - on garde une référence à la lecture en cours : sinon Chrome peut la libérer et couper le
 *   mot en plein milieu (surtout les termes longs).
 *
 * L'état (chargement, lecture, échec) est observable pour l'interface (voir `subscribeSpeech`).
 */

export type SpeechState = "idle" | "loading" | "speaking" | "failed";

let voice: SpeechSynthesisVoice | null = null;
let voicesListening = false;
let unlocked = false;
let lastSpoken = { text: "", at: 0 };
let current: SpeechSynthesisUtterance | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let failTimer: ReturnType<typeof setTimeout> | undefined;
let state: SpeechState = "idle";
const listeners = new Set<() => void>();

/** Relance si la lecture n'a pas démarré, puis abandon (et indice affiché) au-delà. */
const RETRY_AFTER_MS = 350;
const FAIL_AFTER_MS = 3000;

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function setState(next: SpeechState) {
  if (state === next) return;
  state = next;
  listeners.forEach((l) => l());
}

/** Abonnement à l'état de la synthèse (pour `useSyncExternalStore`). */
export function subscribeSpeech(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSpeechState(): SpeechState {
  return state;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const english = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("en"));
  const isUS = (v: SpeechSynthesisVoice) => /en[-_]us/i.test(v.lang);
  return (
    english.find((v) => v.localService && isUS(v)) ??
    english.find((v) => v.localService) ??
    english.find(isUS) ??
    english[0] ??
    null
  );
}

/** Charge les voix à l'avance (à appeler à l'ouverture d'une leçon). */
export function warmUpSpeech() {
  if (!canSpeak()) return;
  voice = pickVoice();
  if (voicesListening) return;
  voicesListening = true;
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    voice = pickVoice();
  });
}

/** Débloque la synthèse vocale : à appeler dans un gestionnaire de toucher/clic. */
export function unlockSpeech() {
  if (unlocked || !canSpeak()) return;
  unlocked = true;
  const silent = new SpeechSynthesisUtterance(" ");
  silent.volume = 0;
  window.speechSynthesis.speak(silent);
}

function clearTimers() {
  clearTimeout(retryTimer);
  clearTimeout(failTimer);
}

/** Lecture lente : une petite pause entre les mots d'un terme composé (« load, balancer »). */
function slowText(text: string) {
  return text
    .split(/[\s-]+/)
    .filter(Boolean)
    .join(", ");
}

export function speak(text: string, { slow = false } = {}) {
  if (!canSpeak()) {
    setState("failed");
    return;
  }
  const synth = window.speechSynthesis;

  // Évite de relancer le même mot deux fois de suite (toucher + affichage de l'exercice).
  const now = Date.now();
  if (!slow && lastSpoken.text === text && now - lastSpoken.at < 800 && state !== "failed") return;
  lastSpoken = { text, at: now };

  const utterance = new SpeechSynthesisUtterance(slow ? slowText(text) : text);
  utterance.lang = "en-US";
  utterance.rate = slow ? 0.7 : 0.9;
  voice ??= pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  utterance.onstart = () => {
    if (current !== utterance) return;
    clearTimers();
    setState("speaking");
  };
  utterance.onend = () => {
    if (current !== utterance) return;
    clearTimers();
    current = null;
    setState("idle");
  };
  utterance.onerror = (e) => {
    // « interrupted » / « canceled » : une autre lecture a pris la place, ce n'est pas un échec.
    if (current !== utterance || e.error === "interrupted" || e.error === "canceled") return;
    clearTimers();
    current = null;
    setState("failed");
  };

  clearTimers();
  current = utterance;
  setState("loading");

  // Lecture immédiate (pas de délai) : on reste dans le geste de l'utilisateur.
  if (synth.paused) synth.resume();
  if (synth.speaking || synth.pending) synth.cancel();
  synth.speak(utterance);
  unlocked = true;

  retryTimer = setTimeout(() => {
    if (current === utterance && !synth.speaking) {
      synth.cancel();
      synth.speak(utterance);
    }
  }, RETRY_AFTER_MS);
  failTimer = setTimeout(() => {
    if (current !== utterance || state !== "loading") return;
    // Certains Android lisent sans jamais envoyer « start » : on vérifie avant d'abandonner.
    setState(synth.speaking ? "speaking" : "failed");
  }, FAIL_AFTER_MS);
}
