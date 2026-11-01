/**
 * Installation de l'appli (PWA).
 *
 * Android (Chrome, Edge, Samsung Internet) envoie l'événement `beforeinstallprompt` qui permet
 * d'ouvrir la VRAIE fenêtre d'installation depuis notre bouton. Il arrive souvent très tôt,
 * avant que React ait fini de charger (surtout en 3G) : ce script inline, placé dans le <head>,
 * le capte dès le début et le garde dans `window.__hopiInstall`.
 * Doit rester autonome (pas d'import).
 */
export const INSTALLABLE_EVENT = "hopi:installable";

export const installCaptureScript = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__hopiInstall=e;window.dispatchEvent(new Event("${INSTALLABLE_EVENT}"))});window.addEventListener("appinstalled",function(){window.__hopiInstall=null});`;

export type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __hopiInstall?: InstallEvent | null;
  }
}

/** Navigateurs intégrés aux applis (Facebook, Instagram, TikTok…) : ils ne savent pas installer. */
export function isInAppBrowser(ua: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|Snapchat|; wv\)/i.test(ua);
}

export function isIOS(ua: string): boolean {
  return /iphone|ipad|ipod/i.test(ua);
}

/** Lien qui rouvre la page actuelle dans Chrome sur Android (depuis un navigateur intégré). */
export function chromeIntentUrl(href: string): string {
  const url = new URL(href);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}
