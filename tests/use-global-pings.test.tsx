// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGlobalPings } from "@/lib/usePings";

function Probe() {
  const { counts } = useGlobalPings();
  return <p data-testid="total">{counts ? counts.total : "none"}</p>;
}

const hidden = (value: boolean) =>
  Object.defineProperty(document, "hidden", { configurable: true, get: () => value });

describe("useGlobalPings", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    hidden(false);
  });

  it("loads the counts on mount even when the page opened in a background tab", async () => {
    hidden(true);
    const fetchMock = vi.fn(async () => Response.json({ total: 7, hours: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const view = render(<Probe />);
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(view.getByTestId("total").textContent).toBe("7");
  });

  it("refreshes when a background tab becomes visible", async () => {
    hidden(true);
    const fetchMock = vi.fn(async () => Response.json({ total: 7, hours: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Probe />);
    await act(async () => {});

    hidden(false);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
