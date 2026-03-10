import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { generateKey, encrypt } from "../lib/crypto.js";
import { PATHS } from "../lib/paths.js";

export async function encryptCommand(options: { input?: string }): Promise<void> {
  const inputFile = options.input || PATHS.plaintext;

  if (!existsSync(inputFile)) {
    console.log(chalk.red(`Input file not found: ${inputFile}`));
    console.log(chalk.dim(`Create ${PATHS.plaintext} or use --input <path>`));
    return;
  }

  const plaintext = await readFile(inputFile, "utf8");
  if (!plaintext.trim()) {
    console.log(chalk.red("Input file is empty."));
    return;
  }

  await mkdir(PATHS.workspace, { recursive: true });

  // Load or generate key
  let key: Buffer;
  if (existsSync(PATHS.key)) {
    const keyHex = (await readFile(PATHS.key, "utf8")).trim();
    key = Buffer.from(keyHex, "hex");
    console.log(chalk.dim("Using existing .vault-key"));
  } else {
    key = generateKey();
    await writeFile(PATHS.key, key.toString("hex") + "\n", { mode: 0o600 });
    console.log(chalk.green("Generated new .vault-key"));
  }

  const vault = encrypt(plaintext, key);

  await mkdir("public", { recursive: true });
  await writeFile(PATHS.vaultOutput, JSON.stringify(vault, null, 2) + "\n");

  console.log(chalk.green(`Encrypted vault written to ${PATHS.vaultOutput}`));
  console.log(chalk.dim(`Plaintext size: ${plaintext.length} chars`));
  console.log(chalk.dim(`Updated: ${vault.updated}`));
}
