import { describe, expect, it } from "vitest";
import { chromeIntentUrl, isInAppBrowser, isIOS } from "./pwa-install";

describe("détection du navigateur", () => {
  it("navigateur intégré Facebook / Instagram / WebView Android", () => {
    expect(isInAppBrowser("Mozilla/5.0 (Linux; Android 13) [FBAN/FB4A;FBAV/450.0]")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 (iPhone) Instagram 300.0")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 (Linux; Android 13; SM-A145F; wv) AppleWebKit")).toBe(true);
  });

  it("Chrome Android classique n'est pas un navigateur intégré", () => {
    expect(
      isInAppBrowser("Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit Chrome/130 Mobile"),
    ).toBe(false);
  });

  it("iPhone", () => {
    expect(isIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true);
    expect(isIOS("Mozilla/5.0 (Linux; Android 13)")).toBe(false);
  });

  it("lien pour rouvrir dans Chrome", () => {
    expect(chromeIntentUrl("https://hopigame.vercel.app/login?next=%2Flearn")).toBe(
      "intent://hopigame.vercel.app/login?next=%2Flearn#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fhopigame.vercel.app%2Flogin%3Fnext%3D%252Flearn;end",
    );
  });
});
