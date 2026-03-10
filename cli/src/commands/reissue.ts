import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import chalk from "chalk";
import { generateKey, encrypt } from "../lib/crypto.js";
import { readConfig } from "../lib/config.js";
import { splitKey } from "../lib/shamir.js";
import { generateSharePDF } from "../lib/pdf.js";
import { PATHS } from "../lib/paths.js";

export async function reissueCommand(options: { input?: string }): Promise<void> {
  const inputFile = options.input || PATHS.plaintext;

  if (!existsSync(inputFile)) {
    console.log(chalk.red(`Input file not found: ${inputFile}`));
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log(chalk.bold.yellow("\nWARNING: This generates a NEW encryption key."));
    console.log(chalk.yellow("All existing shares will become INVALID."));
    console.log(chalk.yellow("You must redistribute ALL new share PDFs.\n"));

    const confirm = await rl.question("Type YES to continue: ");
    if (confirm.trim() !== "YES") {
      console.log(chalk.dim("Cancelled."));
      return;
    }
  } finally {
    rl.close();
  }

  const config = await readConfig();
  const plaintext = await readFile(inputFile, "utf8");
  if (!plaintext.trim()) {
    console.log(chalk.red("Input file is empty."));
    return;
  }

  // Generate new key
  const key = generateKey();
  await writeFile(PATHS.key, key.toString("hex") + "\n", { mode: 0o600 });
  console.log(chalk.green("Generated new .vault-key"));

  // Re-encrypt — revision resets to 1 on reissue
  const vault = encrypt(plaintext, key, 1);
  await writeFile(PATHS.vaultOutput, JSON.stringify(vault, null, 2) + "\n");
  console.log(chalk.green(`Encrypted vault written to ${PATHS.vaultOutput}`));
  console.log(chalk.dim(`Revision: 1 | Updated: ${vault.updated}`));

  // Split new key
  const keyHex = key.toString("hex");
  const shares = splitKey(keyHex, config.totalShares, config.threshold);

  await mkdir(PATHS.shares, { recursive: true });

  for (const share of shares) {
    const filename = `${PATHS.shares}/share-${share.i}.pdf`;
    await generateSharePDF(share, config, filename);
    console.log(chalk.green(`  Created: ${filename}`));
  }

  console.log(chalk.bold.green(`\nReissue complete. ${shares.length} new share PDFs generated.`));
  console.log(chalk.bold.red("Old shares are now INVALID. Collect and destroy them."));
  console.log(chalk.dim("\nNext steps:"));
  console.log(chalk.dim("  1. Print each new share PDF"));
  console.log(chalk.dim("  2. Distribute to holders and collect/destroy old shares"));
  console.log(chalk.dim("  3. Deploy vault.json to your recovery website"));
  console.log(chalk.dim("  4. Run 'vault cleanup' to shred all sensitive files"));
}
