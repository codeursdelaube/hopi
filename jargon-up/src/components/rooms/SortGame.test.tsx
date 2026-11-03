import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPuzzle } from "@/lib/rooms/room";

const submitRoom = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/salle/actions", () => ({ submitRoom: (...args: unknown[]) => submitRoom(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { SortGame } = await import("./SortGame");

const puzzle: PublicPuzzle = {
  concepts: [
    { id: "git", label: "Git" },
    { id: "web", label: "Web" },
  ],
  terms: [
    { id: "t1", term: "commit" },
    { id: "t2", term: "endpoint" },
    { id: "t3", term: "branch" },
  ],
};

function renderGame(startedAt = new Date()) {
  return render(
    <SortGame
      roomId="room-1"
      puzzle={puzzle}
      startedAt={startedAt.toISOString()}
      timeLimitSeconds={60}
      soundEnabled={false}
    />,
  );
}

const category = (label: string) => screen.getByRole("button", { name: new RegExp(label) });

describe("SortGame (un mot à la fois)", () => {
  beforeEach(() => {
    submitRoom.mockReset();
    refresh.mockReset();
    submitRoom.mockResolvedValue({
      ok: true,
      correct: 3,
      total: 3,
      xp: 11,
      capped: false,
      late: false,
    });
  });

  it("affiche un seul mot, qui disparaît dès qu'on choisit sa catégorie", async () => {
    renderGame();
    expect(screen.getByText("commit")).toBeTruthy();
    expect(screen.queryByText("endpoint")).toBeNull();
    expect(screen.getByText("Mot 1/3")).toBeTruthy();

    fireEvent.click(category("Git"));
    expect(await screen.findByText("endpoint")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("commit")).toBeNull());
    expect(screen.getByText("Mot 2/3")).toBeTruthy();
  });

  it("après le dernier mot, envoi automatique de toutes les réponses", async () => {
    renderGame();
    fireEvent.click(category("Git"));
    fireEvent.click(category("Web"));
    fireEvent.click(category("Git"));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(submitRoom).toHaveBeenCalledTimes(1);
    expect(submitRoom).toHaveBeenCalledWith("room-1", {
      placements: [
        { termId: "t1", conceptId: "git" },
        { termId: "t2", conceptId: "web" },
        { termId: "t3", conceptId: "git" },
      ],
      offsetMinutes: expect.any(Number),
    });
  });

  it("clavier : touches 1 et 2 = catégories", async () => {
    renderGame();
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "2" });
    await waitFor(() => expect(submitRoom).toHaveBeenCalledTimes(1));
    expect(submitRoom.mock.calls[0][1].placements).toEqual([
      { termId: "t1", conceptId: "web" },
      { termId: "t2", conceptId: "git" },
      { termId: "t3", conceptId: "web" },
    ]);
  });

  it("temps écoulé : envoi de ce qui est classé, catégories bloquées", async () => {
    renderGame(new Date(Date.now() - 61_000));
    await waitFor(() => expect(submitRoom).toHaveBeenCalledTimes(1));
    expect(submitRoom.mock.calls[0][1].placements).toEqual([]);
    expect((category("Git") as HTMLButtonElement).disabled).toBe(true);
  });

  it("erreur d'envoi : message et bouton pour réessayer", async () => {
    submitRoom.mockResolvedValueOnce({ ok: false, reason: "error" });
    renderGame();
    fireEvent.click(category("Git"));
    fireEvent.click(category("Git"));
    fireEvent.click(category("Git"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Réessayer/ }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(submitRoom).toHaveBeenCalledTimes(2);
  });
});
