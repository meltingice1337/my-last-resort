import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { readConfig } from "../lib/config.js";
import { splitKey } from "../lib/shamir.js";
import { generateSharePDF } from "../lib/pdf.js";
import { PATHS } from "../lib/paths.js";

export async function splitCommand(): Promise<void> {
  if (!existsSync(PATHS.key)) {
    console.log(chalk.red(".vault-key not found. Run 'vault encrypt' first."));
    return;
  }

  const config = await readConfig();
  const keyHex = (await readFile(PATHS.key, "utf8")).trim();

  console.log(chalk.dim(`Splitting key into ${config.totalShares} shares (threshold: ${config.threshold})...`));

  const shares = splitKey(keyHex, config.totalShares, config.threshold);

  await mkdir(PATHS.shares, { recursive: true });

  for (const share of shares) {
    const filename = `${PATHS.shares}/share-${share.i}.pdf`;
    await generateSharePDF(share, config, filename);
    console.log(chalk.green(`  Created: ${filename}`));
  }

  console.log(chalk.bold.green(`\n${shares.length} share PDFs generated in ${PATHS.shares}/`));
  console.log(chalk.dim("\nNext steps:"));
  console.log(chalk.dim("  1. Print each share PDF"));
  console.log(chalk.dim("  2. Distribute one PDF to each trusted holder"));
  console.log(chalk.dim("  3. Deploy vault.json to your recovery website"));
  console.log(chalk.dim("  4. Run 'vault cleanup' to shred all sensitive files"));
}
