import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mascot, type MascotMood } from "./Mascot";
import { fr } from "@/lib/i18n/fr";

describe("Mascot", () => {
  it.each<MascotMood>(["neutral", "happy", "sad", "proud"])(
    "affiche l'humeur %s avec un texte alternatif en français",
    (mood) => {
      render(<Mascot mood={mood} />);
      const img = screen.getByRole("img", { name: fr.mascot.moods[mood] });
      expect(img.getAttribute("data-mood")).toBe(mood);
    },
  );

  it("respecte la taille demandée en gardant le ratio", () => {
    render(<Mascot size={100} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("width")).toBe("100");
    expect(img.getAttribute("height")).toBe("97");
  });

  it("accepte un libellé personnalisé", () => {
    render(<Mascot label="Hopi te salue" />);
    expect(screen.getByRole("img", { name: "Hopi te salue" })).toBeTruthy();
  });
});
