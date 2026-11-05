import "server-only";
import { headers } from "next/headers";
import { isCountryAllowed } from "@/lib/ai/explain";

/**
 * Accès au fournisseur d'IA (Gemini), côté serveur uniquement : la clé n'atteint jamais le
 * navigateur. Tout est isolé ici : changer de fournisseur ne touche que ce fichier.
 */
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
/** Modèle de secours quand le premier est saturé (erreur 503) ou son quota atteint (429). */
const FALLBACK_MODEL = "gemini-flash-lite-latest";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
/** Par modèle ; au-delà, on abandonne : l'élève garde l'explication écrite. */
const TIMEOUT_MS = 10_000;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

/** Le bouton n'existe que si la clé est configurée et le pays de l'élève autorisé. */
export async function isAiExplainAvailable(): Promise<boolean> {
  if (!process.env.GEMINI_API_KEY) return false;
  // En-tête fourni par Vercel (absent en développement local).
  return isCountryAllowed((await headers()).get("x-vercel-ip-country"));
}

async function callModel(model: string, key: string, system: string, prompt: string) {
  return fetch(`${API_URL}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function generateText(system: string, prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  let response = await callModel(model, key, system, prompt);
  // Modèle saturé ou quota atteint : on essaie une fois le modèle de secours.
  if ((response.status === 503 || response.status === 429) && model !== FALLBACK_MODEL) {
    response = await callModel(FALLBACK_MODEL, key, system, prompt);
  }
  if (!response.ok) throw new Error(`Gemini : HTTP ${response.status}`);

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini : réponse vide");
  return text;
}
