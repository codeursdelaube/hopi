import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/app/salle/actions", () => ({
  createRoom: vi.fn().mockResolvedValue({ ok: true, id: "room-42" }),
  startRoom: vi.fn(),
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
  });
});
