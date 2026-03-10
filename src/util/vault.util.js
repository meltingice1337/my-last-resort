/**
 * Fetch and validate vault.json from the deployment.
 * @returns {Promise<{iv: string, ciphertext: string, version: number, updated: string}>}
 */
export async function fetchVault() {
  const base = import.meta.env.BASE_URL || "/";
  const url = `${base}vault.json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch vault.json (${res.status}). Is the vault deployed?`,
    );
  }

  const vault = await res.json();

  if (
    vault.version !== 1 ||
    typeof vault.iv !== "string" ||
    typeof vault.ciphertext !== "string"
  ) {
    throw new Error("Invalid vault.json format");
  }

  return vault;
}
