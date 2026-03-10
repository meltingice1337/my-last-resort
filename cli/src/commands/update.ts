import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { encrypt } from "../lib/crypto.js";
import { PATHS } from "../lib/paths.js";
import { getCurrentRevision } from "./encrypt.js";

export async function updateCommand(options: { input?: string }): Promise<void> {
  const inputFile = options.input || PATHS.plaintext;

  if (!existsSync(PATHS.key)) {
    console.log(chalk.red(".vault-key not found. Run 'vault encrypt' first."));
    console.log(chalk.dim("Use 'vault reissue' if you need to generate a new key."));
    return;
  }

  if (!existsSync(inputFile)) {
    console.log(chalk.red(`Input file not found: ${inputFile}`));
    return;
  }

  const plaintext = await readFile(inputFile, "utf8");
  if (!plaintext.trim()) {
    console.log(chalk.red("Input file is empty."));
    return;
  }

  const keyHex = (await readFile(PATHS.key, "utf8")).trim();
  const key = Buffer.from(keyHex, "hex");

  const revision = getCurrentRevision() + 1;
  const vault = encrypt(plaintext, key, revision);

  await writeFile(PATHS.vaultOutput, JSON.stringify(vault, null, 2) + "\n");

  console.log(chalk.green(`\nvault.json updated (same key — no share redistribution needed)`));
  console.log(chalk.dim(`Revision: ${revision} | Updated: ${vault.updated}`));
  console.log(chalk.dim("\nNext steps:"));
  console.log(chalk.dim("  1. Deploy vault.json to your recovery website"));
  console.log(chalk.dim("  2. Run 'vault cleanup' to shred plaintext.txt and .vault-key"));
}
