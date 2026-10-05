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
