/**
 * Prononciation anglaise via la synthèse vocale du navigateur (Web Speech API).
 *
 * Pour que le son parte VITE :
 * - on préfère une voix installée sur l'appareil (`localService`) : les voix « en ligne »
 *   (ex. « Google US English » sur Chrome) téléchargent l'audio, ce qui est lent en 3G ;
 * - la liste des voix est chargée à l'avance (elle arrive en retard sur Chrome) ;
 * - `unlockSpeech()` doit être appelé pendant un toucher : iOS et certains Android
 *   refusent toute lecture qui ne part pas d'une action de l'utilisateur.
 */

let voice: SpeechSynthesisVoice | null = null;
let unlocked = false;
let lastSpoken = { text: "", at: 0 };

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
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

export function speak(text: string, { slow = false } = {}) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;

  // Évite de relancer le même mot deux fois de suite (toucher + affichage de l'exercice).
  const now = Date.now();
  if (!slow && lastSpoken.text === text && now - lastSpoken.at < 800) return;
  lastSpoken = { text, at: now };

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = slow ? 0.6 : 0.9;
  voice ??= pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  // Chrome peut rester bloqué en pause, et ignore parfois une lecture lancée juste après cancel().
  if (synth.paused) synth.resume();
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(() => synth.speak(utterance), 60);
  } else {
    synth.speak(utterance);
  }
  unlocked = true;
}
