import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { RoomRefresher } = await import("./RoomRefresher");

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
}

describe("RoomRefresher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockReset();
    setVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibility("visible");
  });

  it("relit la page à intervalle régulier", () => {
    render(<RoomRefresher intervalMs={3000} />);
    expect(refresh).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(6000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("ne relit rien quand l'onglet est caché, et relit dès le retour", () => {
    render(<RoomRefresher intervalMs={3000} />);
    setVisibility("hidden");
    act(() => void vi.advanceTimersByTime(9000));
    expect(refresh).not.toHaveBeenCalled();

    setVisibility("visible");
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("s'arrête quand l'écran change", () => {
    const { unmount } = render(<RoomRefresher intervalMs={3000} />);
    unmount();
    act(() => void vi.advanceTimersByTime(9000));
    expect(refresh).not.toHaveBeenCalled();
  });
});
