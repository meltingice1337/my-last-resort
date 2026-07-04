import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "./track.js";

describe("track", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { sendBeacon: vi.fn(() => true) });
    vi.stubGlobal("crypto", { randomUUID: () => "test-session" });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no-ops when VITE_COLLECTOR_URL is unset", () => {
    vi.stubEnv("VITE_COLLECTOR_URL", "");
    track("app_open");
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it("sends a text/plain beacon to the collector when set", () => {
    vi.stubEnv("VITE_COLLECTOR_URL", "https://c.example/e");
    track("share_added", { shares: 1, threshold: 3 });
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = navigator.sendBeacon.mock.calls[0];
    expect(url).toBe("https://c.example/e");
    expect(blob.type).toContain("text/plain");
  });

  it("never throws even if sendBeacon throws", () => {
    vi.stubEnv("VITE_COLLECTOR_URL", "https://c.example/e");
    navigator.sendBeacon = vi.fn(() => {
      throw new Error("boom");
    });
    expect(() => track("app_open")).not.toThrow();
  });
});
