// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGlobalPings } from "@/lib/usePings";

function Probe() {
  const { counts, report } = useGlobalPings();
  return (
    <>
      <p data-testid="total">{counts ? counts.total : "none"}</p>
      <button type="button" onClick={() => void report()}>
        ping
      </button>
    </>
  );
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

  it("never rolls the count back when a cached poll lands after your own ping", async () => {
    hidden(false);
    let served = { total: 7, hours: [] as unknown[] };
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? Response.json({ total: 8, hours: [{ startMs: 0, count: 1 }] })
        : Response.json(served),
    );
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<Probe />);
    await act(async () => {});
    expect(view.getByTestId("total").textContent).toBe("7");

    await act(async () => {
      fireEvent.click(view.getByText("ping"));
    });
    expect(view.getByTestId("total").textContent).toBe("8");

    // A CDN-cached GET from before the ping comes back late.
    served = { total: 7, hours: [] };
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(view.getByTestId("total").textContent).toBe("8");
  });
});
