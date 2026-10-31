/**
 * Petits sons de jeu synthétisés avec Web Audio : aucun fichier à télécharger
 * (important avec une connexion lente). Désactivables dans les réglages.
 */
type SoundKind = "correct" | "wrong" | "complete" | "tap";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume = 0.15,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

export function playSound(kind: SoundKind, enabled: boolean) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  switch (kind) {
    case "correct":
      tone(ac, 660, 0, 0.12, "sine");
      tone(ac, 990, 0.1, 0.2, "sine");
      break;
    case "wrong":
      tone(ac, 220, 0, 0.25, "triangle", 0.12);
      tone(ac, 180, 0.12, 0.3, "triangle", 0.1);
      break;
    case "complete":
      [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, i * 0.11, 0.25, "sine"));
      break;
    case "tap":
      tone(ac, 880, 0, 0.05, "sine", 0.05);
      break;
  }
}
