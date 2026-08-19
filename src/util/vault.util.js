import { VAULT_FORMAT_VERSION } from "./crypto.util";

/**
 * Fetch and validate vault.json from the deployment.
 *
 * `revision` and `updated` are validated as strictly as the ciphertext because
 * they are authenticated inputs: they feed the AES-GCM additional data, so a
 * missing or wrong-typed field would fail decryption in a confusing way.
 *
 * @returns {Promise<{version: number, revision: number, updated: string, iv: string, ciphertext: string}>}
 */
export async function fetchVault() {
  const base = import.meta.env.BASE_URL || "/";
  const url = `${base}vault.json`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch vault.json (${res.status}). Is the vault deployed?`,
    );
  }

  const vault = await res.json();

  if (vault.version !== VAULT_FORMAT_VERSION) {
    throw new Error(
      `This vault.json is format v${vault.version}, but this app requires v${VAULT_FORMAT_VERSION}. ` +
        `Re-seal it with 'vault update' and redeploy.`,
    );
  }

  if (
    typeof vault.revision !== "number" ||
    typeof vault.updated !== "string" ||
    typeof vault.iv !== "string" ||
    typeof vault.ciphertext !== "string"
  ) {
    throw new Error("Invalid vault.json format");
  }

  return vault;
}
