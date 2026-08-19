/**
 * Vault format version this app can decrypt.
 *
 * v1 sealed only the plaintext, so `revision` and `updated` were unauthenticated
 * text sitting next to it: any authentic ciphertext could be relabelled with any
 * revision and date, without the key, and still decrypt. v2 seals those fields
 * into the AES-GCM tag, so the revision a holder sees is the one that was sealed.
 *
 * v1 is deliberately NOT accepted here. Accepting it would let anyone who can
 * write to the recovery site downgrade a v2 vault back to the format with no
 * metadata binding, which would undo the protection entirely.
 */
export const VAULT_FORMAT_VERSION = 2;

/**
 * Canonical additional authenticated data for a v2 vault.
 *
 * The CLI builds this identical string in `crates/vault-cli/src/crypto.rs`
 * (`build_aad`). The two must agree byte for byte or recovery fails, so any
 * change here MUST be mirrored there. Both sides pin the format in tests.
 */
function buildAad({ version, revision, updated }) {
  return new TextEncoder().encode(
    `emergency-vault/v2|version:${version}|revision:${revision}|updated:${updated}`,
  );
}

/**
 * Decrypt vault data using WebCrypto AES-256-GCM.
 *
 * Throws if the vault's metadata does not match what was sealed, which is what
 * makes a rolled-back or relabelled vault.json fail loudly instead of silently
 * handing back a stale secret.
 *
 * @param {{version: number, revision: number, updated: string, iv: string, ciphertext: string}} vault
 * @param {string} keyHex - 64-char hex string (32 bytes)
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptVault(vault, keyHex) {
  if (vault.version !== VAULT_FORMAT_VERSION) {
    throw new Error(
      `Unsupported vault format v${vault.version}. This app requires v${VAULT_FORMAT_VERSION}.`,
    );
  }

  // Convert hex key to Uint8Array
  const keyBytes = new Uint8Array(
    keyHex.match(/.{2}/g).map((b) => parseInt(b, 16)),
  );

  // Decode base64 IV and ciphertext
  const iv = Uint8Array.from(atob(vault.iv), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(vault.ciphertext), (c) =>
    c.charCodeAt(0),
  );

  // Import key for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // Decrypt (WebCrypto expects auth tag appended to ciphertext).
  // additionalData binds version/revision/updated into the tag.
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: buildAad(vault) },
    cryptoKey,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}
