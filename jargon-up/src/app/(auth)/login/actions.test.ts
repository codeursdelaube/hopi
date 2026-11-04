import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = { signInWithOtp: vi.fn(), verifyOtp: vi.fn(), signInWithOAuth: vi.fn() };
const profile = { data: null as { field_id: string | null } | null };
const cookieSet = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => profile }) }) }),
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet }),
  headers: async () => new Headers({ origin: "https://hopigame.vercel.app" }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

process.env.EMAIL_LOGIN_ENABLED = "true";
const { sendEmailCode, verifyEmailCode } = await import("./actions");

describe("sendEmailCode", () => {
  beforeEach(() => {
    auth.signInWithOtp.mockReset();
    cookieSet.mockReset();
  });

  it("fonction désactivée (pas de SMTP configuré) : rien n'est envoyé", async () => {
    process.env.EMAIL_LOGIN_ENABLED = "false";
    try {
      expect(await sendEmailCode("a@b.co", "/learn")).toEqual({ ok: false, reason: "error" });
      expect(auth.signInWithOtp).not.toHaveBeenCalled();
    } finally {
      process.env.EMAIL_LOGIN_ENABLED = "true";
    }
  });

  it("refuse une adresse invalide sans rien envoyer", async () => {
    expect(await sendEmailCode("pas-une-adresse", "/learn")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("envoie le code (adresse normalisée) et retient la page demandée", async () => {
    auth.signInWithOtp.mockResolvedValue({ error: null });
    expect(await sendEmailCode("  Koffi@iCloud.COM ", "/salle/abc")).toEqual({
      ok: true,
      email: "koffi@icloud.com",
    });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "koffi@icloud.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "https://hopigame.vercel.app/auth/callback",
      },
    });
    expect(cookieSet).toHaveBeenCalledWith("hopi_next", "%2Fsalle%2Fabc", expect.any(Object));
  });

  it("limite d'envoi atteinte : message dédié", async () => {
    auth.signInWithOtp.mockResolvedValue({
      error: { status: 429, code: "over_email_send_rate_limit", message: "rate" },
    });
    expect(await sendEmailCode("a@b.co", "/learn")).toEqual({ ok: false, reason: "rate_limit" });
  });

  it("une redirection externe n'est jamais retenue", async () => {
    auth.signInWithOtp.mockResolvedValue({ error: null });
    await sendEmailCode("a@b.co", "https://evil.example");
    expect(cookieSet).toHaveBeenCalledWith("hopi_next", "%2Flearn", expect.any(Object));
  });
});

describe("verifyEmailCode", () => {
  beforeEach(() => {
    auth.verifyOtp.mockReset();
    redirect.mockClear();
  });

  it("code mal formé : refusé sans appel au serveur", async () => {
    expect(await verifyEmailCode("a@b.co", "12ab", "/learn")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("code faux ou expiré : message unique", async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: { status: 403, code: "otp_expired", message: "Token has expired or is invalid" },
    });
    expect(await verifyEmailCode("a@b.co", "123456", "/learn")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("nouveau compte : onboarding, puis la page demandée", async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profile.data = { field_id: null };
    await expect(verifyEmailCode("a@b.co", "123 456", "/salle/abc")).rejects.toThrow(
      "REDIRECT:/onboarding?next=%2Fsalle%2Fabc",
    );
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "a@b.co",
      token: "123456",
      type: "email",
    });
  });

  it("compte existant : directement la page demandée", async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profile.data = { field_id: "tech" };
    await expect(verifyEmailCode("a@b.co", "123456", "/learn")).rejects.toThrow("REDIRECT:/learn");
  });
});
