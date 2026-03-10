import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import type { VaultJson } from "./types.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export function generateKey(): Buffer {
  return randomBytes(KEY_LENGTH);
}

export function encrypt(plaintext: string, key: Buffer, revision: number): VaultJson {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Concatenate ciphertext + authTag (WebCrypto-compatible format)
  const ciphertextWithTag = Buffer.concat([encrypted, authTag]);

  return {
    version: 1,
    revision,
    updated: new Date().toISOString(),
    iv: iv.toString("base64"),
    ciphertext: ciphertextWithTag.toString("base64"),
  };
}

export function decrypt(vault: VaultJson, key: Buffer): string {
  const iv = Buffer.from(vault.iv, "base64");
  const ciphertextWithTag = Buffer.from(vault.ciphertext, "base64");

  // Split ciphertext and auth tag (last 16 bytes)
  const ciphertext = ciphertextWithTag.subarray(0, -16);
  const authTag = ciphertextWithTag.subarray(-16);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
