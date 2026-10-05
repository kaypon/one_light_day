// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { currentTime } from "@/lib/useNow";

describe("currentTime", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the clock fresh, even when no animation frame has run since", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_790_000_000_000);
    expect(currentTime()).toBe(1_790_000_000_000);

    now.mockReturnValue(1_790_000_030_000); // 30 s later, page in a background tab
    expect(currentTime()).toBe(1_790_000_030_000);
  });
});

describe("quantize", () => {
  it("rounds a time down to the subscriber's resolution, or leaves it alone at 0", async () => {
    const { quantize } = await import("@/lib/useNow");
    expect(quantize(1_790_000_012_345, 1_000)).toBe(1_790_000_012_000);
    expect(quantize(1_790_000_012_345, 60_000)).toBe(1_789_999_980_000);
    expect(quantize(1_790_000_012_345, 0)).toBe(1_790_000_012_345);
  });
});
