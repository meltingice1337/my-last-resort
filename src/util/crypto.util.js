/**
 * Decrypt vault data using WebCrypto AES-256-GCM.
 * @param {string} ciphertextBase64 - Base64-encoded ciphertext with auth tag appended
 * @param {string} ivBase64 - Base64-encoded 12-byte IV
 * @param {string} keyHex - 64-char hex string (32 bytes)
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptVault(ciphertextBase64, ivBase64, keyHex) {
  // Convert hex key to Uint8Array
  const keyBytes = new Uint8Array(
    keyHex.match(/.{2}/g).map((b) => parseInt(b, 16)),
  );

  // Decode base64 IV and ciphertext
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), (c) =>
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

  // Decrypt (WebCrypto expects auth tag appended to ciphertext)
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}
