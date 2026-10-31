/** Prononciation anglaise via la synthèse vocale du navigateur (Web Speech API). */

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, { slow = false } = {}) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = slow ? 0.6 : 0.95;
  const voice =
    synth.getVoices().find((v) => v.lang === "en-US") ??
    synth.getVoices().find((v) => v.lang.startsWith("en"));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}
