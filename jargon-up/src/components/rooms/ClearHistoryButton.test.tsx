import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clearRoomHistory = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/salle/actions", () => ({
  clearRoomHistory: (...args: unknown[]) => clearRoomHistory(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { ClearHistoryButton } = await import("./ClearHistoryButton");

describe("ClearHistoryButton", () => {
  beforeEach(() => {
    clearRoomHistory.mockReset();
    refresh.mockReset();
  });

  it("demande confirmation ; « Annuler » ne vide rien", () => {
    render(<ClearHistoryButton />);
    fireEvent.click(screen.getByRole("button", { name: /Vider l'historique/ }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(clearRoomHistory).not.toHaveBeenCalled();
  });

  it("« Oui, vider » vide l'historique puis rafraîchit la page", async () => {
    clearRoomHistory.mockResolvedValue({ ok: true });
    render(<ClearHistoryButton />);
    fireEvent.click(screen.getByRole("button", { name: /Vider l'historique/ }));
    fireEvent.click(screen.getByRole("button", { name: /Oui, vider/ }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(clearRoomHistory).toHaveBeenCalledTimes(1);
  });

  it("erreur : message affiché, rien n'est rafraîchi", async () => {
    clearRoomHistory.mockResolvedValue({ ok: false });
    render(<ClearHistoryButton />);
    fireEvent.click(screen.getByRole("button", { name: /Vider l'historique/ }));
    fireEvent.click(screen.getByRole("button", { name: /Oui, vider/ }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
