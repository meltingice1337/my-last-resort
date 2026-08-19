import { describe, expect, it } from "vitest";
import { decryptVault } from "./crypto.util.js";

// Golden vector produced by the Rust CLI (`vault encrypt` then `vault update`)
// with a throwaway key. Its purpose is to pin cross-implementation agreement:
// if `build_aad` in crates/vault-cli/src/crypto.rs and `buildAad` in
// crypto.util.js ever drift apart, this vault stops decrypting here and real
// recovery would break in exactly the same way.
const KEY = "98fe597e42ca1a0502ccf860f4fbedd87817cb0ed78e5e1f6c5e8aedebde742a";
const VAULT = {
  version: 2,
  revision: 2,
  updated: "2026-08-19T08:27:28.910Z",
  iv: "+9SuJJHCZ2xc8NLd",
  ciphertext: "udID1oH/mvni8olh5JGvpFJSVLkxtogRK2QXq7U7cHDPncjbXsoj",
};

describe("decryptVault", () => {
  it("decrypts a vault sealed by the Rust CLI", async () => {
    await expect(decryptVault(VAULT, KEY)).resolves.toBe(
      "golden-vector-plaintext",
    );
  });

  it("rejects a ciphertext relabelled with a higher revision", async () => {
    // The rollback attack: authentic ciphertext, forged revision. Under v1 this
    // decrypted cleanly and handed back a stale secret.
    await expect(
      decryptVault({ ...VAULT, revision: 7 }, KEY),
    ).rejects.toThrow();
  });

  it("rejects a ciphertext relabelled with a lower revision", async () => {
    await expect(
      decryptVault({ ...VAULT, revision: 1 }, KEY),
    ).rejects.toThrow();
  });

  it("rejects a forged updated timestamp", async () => {
    await expect(
      decryptVault({ ...VAULT, updated: "2099-01-01T00:00:00.000Z" }, KEY),
    ).rejects.toThrow();
  });

  it("refuses to downgrade to the unbound v1 format", async () => {
    await expect(decryptVault({ ...VAULT, version: 1 }, KEY)).rejects.toThrow(
      /Unsupported vault format v1/,
    );
  });

  it("refuses an unknown format version", async () => {
    await expect(decryptVault({ ...VAULT, version: 9 }, KEY)).rejects.toThrow(
      /Unsupported vault format v9/,
    );
  });

  it("rejects a wrong key", async () => {
    await expect(decryptVault(VAULT, "00".repeat(32))).rejects.toThrow();
  });
});
