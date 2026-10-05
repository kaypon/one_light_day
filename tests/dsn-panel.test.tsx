// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DsnPanel } from "@/components/dsn/DsnPanel";

const daily = readFileSync(join(__dirname, "../public/data/voyager1-daily.json"), "utf8");
const voyager = {
  code: "VGR1",
  name: "Voyager 1",
  station: "Madrid",
  dish: "DSS 63",
  size: "70 m",
  downBps: 160,
  receiving: true,
  rtltSec: 171_930.4,
  rangeKm: 2.5777e10,
};

function serve(dsn: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("/api/dsn")
        ? new Response(JSON.stringify(dsn), { status })
        : new Response(daily, { headers: { "content-type": "application/json" } }),
    ),
  );
}

describe("DsnPanel", () => {
  beforeEach(() => {
    // Reduced motion: the shared clock ticks once a second instead of using rAF.
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.useFakeTimers({ toFake: ["Date"], now: Date.UTC(2026, 9, 10, 12) });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("says when Voyager 1 is on the line, with the dish, rate and round trip", async () => {
    serve({ fetchedAt: 1, stations: [{ name: "Madrid", links: [voyager] }], voyager1: voyager });
    const view = render(<DsnPanel />);
    await act(async () => {});
    expect(view.getByText("Voyager 1 is on the line.")).toBeTruthy();
    expect(view.container.textContent).toContain("DSS 63, a 70 m dish in Madrid, is pulling in its signal at 160 bits/s.");
    expect(view.container.textContent).toContain("Round trip, by the DSN: 47h 45m 30s");
  });

  it("says plainly when nobody is talking to it", async () => {
    serve({ fetchedAt: 1, stations: [{ name: "Goldstone", links: [] }], voyager1: null });
    const view = render(<DsnPanel />);
    await act(async () => {});
    expect(view.getByText("Nobody's on the line with Voyager 1 right now.")).toBeTruthy();
  });

  it("tells you to try later when NASA's feed is down", async () => {
    serve({ error: "unavailable" }, 503);
    const view = render(<DsnPanel />);
    await act(async () => {});
    expect(view.container.textContent).toContain("NASA's live feed isn't answering right now.");
  });
});
