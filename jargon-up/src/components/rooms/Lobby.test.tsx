import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LobbyPlayer } from "@/lib/rooms/room";

const refresh = vi.fn();
const launchRoom = vi.fn();
const setRoomReady = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/salle/actions", () => ({
  launchRoom: (...args: unknown[]) => launchRoom(...args),
  setRoomReady: (...args: unknown[]) => setRoomReady(...args),
}));

const { Lobby } = await import("./Lobby");

const player = (userId: string, ready: boolean): LobbyPlayer => ({
  userId,
  name: userId,
  avatarUrl: null,
  ready,
});

function renderLobby(meId: string, players: LobbyPlayer[]) {
  return render(
    <Lobby roomId="room-1" meId={meId} hostId="hote" hostName="Koffi" players={players} />,
  );
}

const launchButton = () =>
  screen.getByRole("button", { name: /Lancer la partie/ }) as HTMLButtonElement;

describe("Lobby", () => {
  beforeEach(() => {
    refresh.mockReset();
    launchRoom.mockReset();
    setRoomReady.mockReset();
    launchRoom.mockResolvedValue({ ok: true });
    setRoomReady.mockResolvedValue({ ok: true });
  });

  it("hôte seul : lancement impossible, invitation à faire venir des amis", () => {
    renderLobby("hote", [player("hote", true)]);
    expect(launchButton().disabled).toBe(true);
    expect(screen.getByText(/au moins un autre joueur prêt/)).toBeTruthy();
  });

  it("un ami présent mais pas prêt : toujours impossible", () => {
    renderLobby("hote", [player("hote", true), player("ama", false)]);
    expect(launchButton().disabled).toBe(true);
    expect(screen.getByText("Pas encore prêt")).toBeTruthy();
  });

  it("un ami prêt : l'hôte peut lancer", async () => {
    renderLobby("hote", [player("hote", true), player("ama", true)]);
    expect(launchButton().textContent).toContain("2 joueurs");
    fireEvent.click(launchButton());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(launchRoom).toHaveBeenCalledWith("room-1");
  });

  it("prévient l'hôte que les joueurs pas prêts ne joueront pas", () => {
    renderLobby("hote", [player("hote", true), player("ama", true), player("kofi", false)]);
    expect(launchButton().disabled).toBe(false);
    expect(screen.getByText(/Prêts : 1 sur 2/)).toBeTruthy();
  });

  it("un invité n'a pas le bouton de lancement, mais peut se déclarer prêt", async () => {
    renderLobby("ama", [player("hote", true), player("ama", false)]);
    expect(screen.queryByRole("button", { name: /Lancer la partie/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Je suis prêt" }));
    await waitFor(() => expect(setRoomReady).toHaveBeenCalledWith("room-1", true));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("un invité prêt attend l'hôte et peut changer d'avis", async () => {
    renderLobby("ama", [player("hote", true), player("ama", true)]);
    expect(screen.getByText(/quand Koffi la lancera/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /pas encore/ }));
    await waitFor(() => expect(setRoomReady).toHaveBeenCalledWith("room-1", false));
  });

  it("lancement refusé par le serveur : message clair", async () => {
    launchRoom.mockResolvedValue({ ok: false, reason: "not_enough" });
    renderLobby("hote", [player("hote", true), player("ama", true)]);
    fireEvent.click(launchButton());
    expect((await screen.findByRole("alert")).textContent).toContain("au moins un autre joueur");
  });
});
