import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import chalk from "chalk";
import { configExists, writeConfig } from "../lib/config.js";
import { PATHS } from "../lib/paths.js";
import type { VaultConfig } from "../lib/types.js";

async function ask(rl: ReturnType<typeof createInterface>, question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await rl.question(`${question}${suffix}: `);
  return answer.trim() || defaultValue || "";
}

export async function initCommand(): Promise<void> {
  if (configExists()) {
    console.log(chalk.yellow("vault.config.json already exists. Delete it first to re-initialize."));
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log(chalk.bold("\nEmergency Vault — Setup\n"));

    const threshold = parseInt(await ask(rl, "Minimum shares to recover (threshold)", "3"), 10);
    const totalShares = parseInt(await ask(rl, "Total number of shares", "5"), 10);

    if (threshold < 2) {
      console.log(chalk.red("Threshold must be at least 2."));
      return;
    }
    if (totalShares < threshold) {
      console.log(chalk.red("Total shares must be >= threshold."));
      return;
    }

    const repoUrl = await ask(rl, "Recovery website URL (GitHub Pages)", "");

    const config: VaultConfig = { threshold, totalShares, repoUrl };

    await writeConfig(config);

    console.log(chalk.green("\nvault.config.json created."));
    console.log(chalk.dim("\nNext steps:"));
    console.log(chalk.dim(`  1. Create ${PATHS.plaintext} with your secret content`));
    console.log(chalk.dim("  2. Run 'vault encrypt' to encrypt and generate vault.json"));
    console.log(chalk.dim("  3. Run 'vault split' to generate Shamir share PDFs"));
    console.log(chalk.dim("  4. Print and distribute share PDFs to holders"));
    console.log(chalk.dim("  5. Run 'vault cleanup' to shred sensitive files"));
  } finally {
    rl.close();
  }
}
