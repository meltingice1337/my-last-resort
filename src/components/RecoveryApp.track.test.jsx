// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../util/track", () => ({ track: vi.fn() }));
vi.mock("../util/vault.util", () => ({
  fetchVault: vi.fn(async () => ({
    ciphertext: "ct",
    iv: "iv",
    revision: 5,
    updated: "2026-07-03",
  })),
}));
vi.mock("../util/crypto.util", () => ({ decryptVault: vi.fn(async () => "SECRET") }));
// sss.util is the only module that touches the vault-wasm binary (top-level
// `init()` call). share.util imports parse_share/ensureInit from it, and
// RecoveryApp imports reconstructKey from it directly, so mocking this one
// module is enough to keep WASM out of the jsdom render.
vi.mock("../util/sss.util", () => ({
  parse_share: vi.fn(() => null),
  ensureInit: vi.fn(async () => {}),
  reconstructKey: vi.fn(async () => "deadbeef".repeat(8)),
}));

import { track } from "../util/track";
import RecoveryApp from "./RecoveryApp";

describe("recovery funnel telemetry", () => {
  it("emits app_open on mount", async () => {
    render(<RecoveryApp />);
    await waitFor(() => expect(track).toHaveBeenCalledWith("app_open", expect.anything()));
  });
});
