import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Answer } from "@/lib/exercises/schemas";

const explainMistake = vi.fn();
/** Panne simulée par une fonction simple : Vitest compte comme erreur un rejet de `vi.fn`. */
let networkDown = false;
vi.mock("@/app/actions/explain", () => ({
  explainMistake: async (...args: unknown[]) => {
    if (networkDown) throw new Error("réseau");
    return explainMistake(...args);
  },
}));

const { AiExplain } = await import("./AiExplain");

const answer: Answer = { type: "fill_blank", choice: "feature" };

function renderIt(previousMistakes = 0) {
  return render(
    <AiExplain
      source="lesson"
      exerciseId="11111111-1111-4111-8111-111111111111"
      answer={answer}
      previousMistakes={previousMistakes}
    />,
  );
}

describe("AiExplain", () => {
  beforeEach(() => {
    explainMistake.mockReset();
    networkDown = false;
  });

  it("rien n'est demandé à l'IA tant que l'élève ne touche pas le bouton", () => {
    renderIt();
    expect(explainMistake).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Explique-moi/ })).toBeTruthy();
  });

  it("affiche l'explication, puis « Explique autrement » change de tentative", async () => {
    explainMistake.mockResolvedValue({ ok: true, text: "Première explication.", remaining: 4 });
    renderIt(1);
    fireEvent.click(screen.getByRole("button", { name: /Explique-moi/ }));
    expect(await screen.findByText("Première explication.")).toBeTruthy();
    expect(explainMistake.mock.calls[0][0]).toMatchObject({ attempt: 1, previousMistakes: 1 });

    explainMistake.mockResolvedValue({ ok: true, text: "Deuxième explication.", remaining: 3 });
    fireEvent.click(await screen.findByRole("button", { name: /Explique autrement/ }));
    expect(await screen.findByText("Deuxième explication.")).toBeTruthy();
    expect(explainMistake.mock.calls[1][0]).toMatchObject({ attempt: 2 });
  });

  it("limite du jour atteinte : message clair", async () => {
    explainMistake.mockResolvedValue({ ok: false, reason: "limit" });
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: /Explique-moi/ }));
    expect(await screen.findByText(/limite/i)).toBeTruthy();
  });

  it("IA ou réseau en panne : message, sans erreur bloquante", async () => {
    networkDown = true;
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: /Explique-moi/ }));
    expect((await screen.findByRole("status")).textContent).toContain("pas disponible");
  });

  it("plus de bouton après la dernière explication du jour", async () => {
    explainMistake.mockResolvedValue({ ok: true, text: "Dernière.", remaining: 0 });
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: /Explique-moi/ }));
    await screen.findByText("Dernière.");
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  });
});
