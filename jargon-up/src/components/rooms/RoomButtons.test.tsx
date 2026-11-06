import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
const createRoom = vi.fn().mockResolvedValue({ ok: true, id: "room-42" });
vi.mock("@/app/salle/actions", () => ({
  createRoom: (...args: unknown[]) => createRoom(...args),
  joinRoom: vi.fn(),
}));

const { CreateRoomButton } = await import("./RoomButtons");

describe("CreateRoomButton", () => {
  it("ferme la fenêtre de partage AVANT d'ouvrir la salle (sinon le défilement reste bloqué)", async () => {
    render(<CreateRoomButton />);
    fireEvent.click(screen.getByRole("button", { name: /Créer une salle/ }));

    const dialog = await screen.findByRole("dialog");
    expect(document.querySelector(".modal-open")).not.toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Fermer" })[0]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(dialog.isConnected).toBe(false);
    expect(document.querySelector(".modal-open")).toBeNull();
    expect(push).toHaveBeenCalledWith("/salle/room-42");
    // Valeurs par défaut : 1 min 30 pour trier, salle ouverte 1 h.
    expect(createRoom).toHaveBeenCalledWith(90, 60);
  });

  it("transmet la durée d'ouverture choisie par l'hôte", async () => {
    createRoom.mockClear();
    render(<CreateRoomButton />);
    fireEvent.click(screen.getByLabelText("24 h"));
    fireEvent.click(screen.getByLabelText("2 min"));
    fireEvent.click(screen.getByRole("button", { name: /Créer une salle/ }));
    await waitFor(() => expect(createRoom).toHaveBeenCalledWith(120, 1440));
  });
});
