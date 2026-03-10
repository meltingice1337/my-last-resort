import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { encrypt } from "../lib/crypto.js";
import { PATHS } from "../lib/paths.js";

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

  const vault = encrypt(plaintext, key);

  await mkdir("public", { recursive: true });
  await writeFile(PATHS.vaultOutput, JSON.stringify(vault, null, 2) + "\n");

  console.log(chalk.green(`vault.json updated (same key — no share redistribution needed)`));
  console.log(chalk.dim(`Updated: ${vault.updated}`));
}
