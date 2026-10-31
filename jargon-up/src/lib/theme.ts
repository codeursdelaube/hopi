/**
 * Thème clair / sombre / système, mémorisé sur l'appareil (localStorage : simple préférence locale).
 * « system » suit le réglage du téléphone (thème `hopi-dark` marqué prefersdark).
 */
export type ThemeChoice = "system" | "light" | "dark";

const KEY = "hopi-theme";
const THEMES = { light: "hopi", dark: "hopi-dark" } as const;

export function getStoredTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour cette visite seulement.
  }
  applyTheme(choice);
}

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", THEMES[choice]);
}

export function applyStoredTheme() {
  applyTheme(getStoredTheme());
}

/**
 * Script inline exécuté avant l'affichage, pour éviter un flash du mauvais thème.
 * Doit rester autonome (pas d'import).
 */
export const themeInitScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light")document.documentElement.setAttribute("data-theme","${THEMES.light}");else if(t==="dark")document.documentElement.setAttribute("data-theme","${THEMES.dark}")}catch(e){}`;
