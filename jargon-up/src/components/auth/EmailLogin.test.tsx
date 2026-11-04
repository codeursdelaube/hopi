import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmailCode = vi.fn();
const verifyEmailCode = vi.fn();
vi.mock("@/app/(auth)/login/actions", () => ({
  sendEmailCode: (...args: unknown[]) => sendEmailCode(...args),
  verifyEmailCode: (...args: unknown[]) => verifyEmailCode(...args),
}));

const { EmailLogin } = await import("./EmailLogin");

async function goToCodeStep() {
  sendEmailCode.mockResolvedValue({ ok: true, email: "koffi@icloud.com" });
  render(<EmailLogin next="/salle/abc" />);
  fireEvent.change(screen.getByLabelText("Ton adresse e-mail"), {
    target: { value: "Koffi@iCloud.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Recevoir un code/ }));
  await screen.findByLabelText("Code reçu par e-mail");
}

describe("EmailLogin", () => {
  beforeEach(() => {
    sendEmailCode.mockReset();
    verifyEmailCode.mockReset();
  });

  it("envoie le code puis demande de le saisir", async () => {
    await goToCodeStep();
    expect(sendEmailCode).toHaveBeenCalledWith("Koffi@iCloud.com", "/salle/abc");
    expect(screen.getByText(/Code envoyé à koffi@icloud.com/)).toBeTruthy();
    const input = screen.getByLabelText("Code reçu par e-mail") as HTMLInputElement;
    expect(input.autocomplete).toBe("one-time-code");
  });

  it("garde seulement les chiffres et valide tout seul au 6e", async () => {
    await goToCodeStep();
    verifyEmailCode.mockResolvedValue({ ok: false, reason: "invalid" });
    fireEvent.change(screen.getByLabelText("Code reçu par e-mail"), {
      target: { value: "12 34-56" },
    });
    await waitFor(() =>
      expect(verifyEmailCode).toHaveBeenCalledWith("koffi@icloud.com", "123456", "/salle/abc"),
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Code incorrect ou expiré/)).toBeTruthy();
  });

  it("affiche l'erreur d'envoi (trop de demandes)", async () => {
    sendEmailCode.mockResolvedValue({ ok: false, reason: "rate_limit" });
    render(<EmailLogin next="/learn" />);
    fireEvent.change(screen.getByLabelText("Ton adresse e-mail"), {
      target: { value: "a@b.co" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Recevoir un code/ }));
    expect(await screen.findByText(/Trop de demandes/)).toBeTruthy();
  });

  it("« Renvoyer le code » attend la fin du délai ; on peut changer d'adresse", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await goToCodeStep();
      const resend = screen.getByRole("button", { name: /Renvoyer le code \(60 s\)/ });
      expect((resend as HTMLButtonElement).disabled).toBe(true);
      await act(async () => {
        vi.advanceTimersByTime(61_000);
      });
      expect(
        (screen.getByRole("button", { name: "Renvoyer le code" }) as HTMLButtonElement).disabled,
      ).toBe(false);

      fireEvent.click(screen.getByRole("button", { name: "Changer d'adresse" }));
      expect(screen.getByLabelText("Ton adresse e-mail")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
