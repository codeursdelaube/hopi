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

describe("SortGame", () => {
  beforeEach(() => {
    submitRoom.mockReset();
    refresh.mockReset();
  });

  it("range un terme dans un thème, puis le retire", () => {
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: "commit" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Ranger « commit » ici" })[0]);
    expect(screen.getByText("1/2 rangés")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retirer « commit »" }));
    expect(screen.getByText("0/2 rangés")).toBeTruthy();
  });

  it("validation possible seulement quand tout est rangé, avec les bons placements", async () => {
    submitRoom.mockResolvedValue({ ok: true, correct: 2, total: 2, xp: 9, capped: false });
    renderGame();
    const submit = screen.getByRole("button", { name: "Valider" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "commit" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Ranger « commit » ici" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "endpoint" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Ranger « endpoint » ici" })[1]);

    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(submitRoom).toHaveBeenCalledWith("room-1", {
      placements: [
        { termId: "t1", conceptId: "git" },
        { termId: "t2", conceptId: "web" },
      ],
      offsetMinutes: expect.any(Number),
    });
  });

  it("temps écoulé : envoi automatique de ce qui est rangé, plus rien ne bouge", async () => {
    submitRoom.mockResolvedValue({
      ok: true,
      correct: 0,
      total: 2,
      xp: 0,
      capped: false,
      late: false,
    });
    renderGame(new Date(Date.now() - 61_000));
    await waitFor(() => expect(submitRoom).toHaveBeenCalledTimes(1));
    expect(submitRoom).toHaveBeenCalledWith("room-1", {
      placements: [],
      offsetMinutes: expect.any(Number),
    });
    expect(screen.getByText("Temps écoulé !")).toBeTruthy();
    const term = screen.getByRole("button", { name: "commit" }) as HTMLButtonElement;
    expect(term.disabled).toBe(true);
  });

  it("affiche une erreur si l'envoi échoue", async () => {
    submitRoom.mockResolvedValue({ ok: false, reason: "error" });
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: "commit" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Ranger « commit » ici" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "endpoint" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Ranger « endpoint » ici" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
