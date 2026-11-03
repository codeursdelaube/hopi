import { afterEach, describe, expect, it, vi } from "vitest";

/** Fausse synthèse vocale : enregistre les lectures, l'état « speaking » est piloté par le test. */
class FakeUtterance {
  lang = "";
  rate = 1;
  volume = 1;
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

function installSynth() {
  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    spoken: [] as FakeUtterance[],
    speak: vi.fn((u: FakeUtterance) => synth.spoken.push(u)),
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [{ lang: "en-US", localService: true, name: "English" }],
    addEventListener: vi.fn(),
  };
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  return synth;
}

// Le module garde un état global : on le recharge pour chaque test (avec de vraies
// minuteries, le chargement dynamique en a besoin), puis on passe aux minuteries simulées.
async function load() {
  vi.useRealTimers();
  vi.resetModules();
  const mod = await import("./speech");
  vi.useFakeTimers();
  return mod;
}

describe("speech", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("lance la lecture tout de suite, dans le geste de l'utilisateur (pas de délai)", async () => {
    const synth = installSynth();
    const { speak, getSpeechState } = await load();
    synth.speaking = true; // un autre son est en cours : il est coupé, sans attente
    speak("load balancer");
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(getSpeechState()).toBe("loading");
  });

  it("suit l'état de la lecture : chargement → lecture → fin", async () => {
    const synth = installSynth();
    const { speak, getSpeechState, subscribeSpeech } = await load();
    const changes = vi.fn();
    subscribeSpeech(changes);
    speak("repository");
    synth.spoken[0].onstart?.();
    expect(getSpeechState()).toBe("speaking");
    synth.spoken[0].onend?.();
    expect(getSpeechState()).toBe("idle");
    expect(changes).toHaveBeenCalledTimes(3);
  });

  it("relance une fois si le navigateur ignore la lecture", async () => {
    const synth = installSynth();
    const { speak } = await load();
    speak("depreciation");
    vi.advanceTimersByTime(400);
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });

  it("signale l'échec si rien ne sort (l'indice pourra s'afficher)", async () => {
    installSynth();
    const { speak, getSpeechState } = await load();
    speak("depreciation");
    vi.advanceTimersByTime(3100);
    expect(getSpeechState()).toBe("failed");
  });

  it("pas d'échec si le navigateur lit sans prévenir", async () => {
    const synth = installSynth();
    const { speak, getSpeechState } = await load();
    speak("latency");
    synth.speaking = true;
    vi.advanceTimersByTime(3100);
    expect(getSpeechState()).toBe("speaking");
  });

  it("une lecture interrompue par une autre n'est pas un échec", async () => {
    const synth = installSynth();
    const { speak, getSpeechState } = await load();
    speak("fork");
    speak("feature");
    synth.spoken[0].onerror?.({ error: "interrupted" });
    expect(getSpeechState()).toBe("loading");
  });

  it("lecture lente : pause entre les mots d'un terme composé", async () => {
    const synth = installSynth();
    const { speak } = await load();
    speak("load balancer", { slow: true });
    expect(synth.spoken[0].text).toBe("load, balancer");
    expect(synth.spoken[0].rate).toBeLessThan(0.9);
  });

  it("ne relit pas deux fois de suite le même mot (toucher + affichage)", async () => {
    const synth = installSynth();
    const { speak } = await load();
    speak("upgrade");
    speak("upgrade");
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });
});
