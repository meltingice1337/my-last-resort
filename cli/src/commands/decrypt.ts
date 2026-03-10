import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { decrypt } from "../lib/crypto.js";
import { PATHS } from "../lib/paths.js";
import type { VaultJson } from "../lib/types.js";

export async function decryptCommand(options: { output?: string }): Promise<void> {
  const outputFile = options.output || PATHS.plaintext;

  if (!existsSync(PATHS.vaultOutput)) {
    console.log(chalk.red(`vault.json not found at ${PATHS.vaultOutput}`));
    console.log(chalk.dim("Run 'vault encrypt' first."));
    return;
  }

  if (!existsSync(PATHS.key)) {
    console.log(chalk.red(".vault-key not found."));
    console.log(chalk.dim("Place your .vault-key in vault-workspace/ to decrypt."));
    return;
  }

  const vaultRaw = await readFile(PATHS.vaultOutput, "utf8");
  const vault: VaultJson = JSON.parse(vaultRaw);

  const keyHex = (await readFile(PATHS.key, "utf8")).trim();
  const key = Buffer.from(keyHex, "hex");

  let plaintext: string;
  try {
    plaintext = decrypt(vault, key);
  } catch {
    console.log(chalk.red("Decryption failed — wrong key or corrupted vault.json."));
    return;
  }

  await mkdir(PATHS.workspace, { recursive: true });
  await writeFile(outputFile, plaintext, { mode: 0o600 });

  console.log(chalk.green(`Decrypted to ${outputFile}`));
  console.log(chalk.dim(`Revision: ${vault.revision || "unknown"} | Updated: ${vault.updated}`));
  console.log(chalk.dim("Edit the file, then run 'vault update' to re-encrypt."));
}
