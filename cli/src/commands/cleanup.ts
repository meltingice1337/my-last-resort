import { readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import chalk from "chalk";
import { PATHS } from "../lib/paths.js";

const SENSITIVE_FILES = [PATHS.key, PATHS.plaintext];

export async function cleanupCommand(): Promise<void> {
  const hasShred = (() => {
    try {
      execSync("which shred", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();

  const files: string[] = [];

  // Collect sensitive files that exist
  for (const f of SENSITIVE_FILES) {
    if (existsSync(f)) files.push(f);
  }

  // Collect share PDFs
  if (existsSync(PATHS.shares)) {
    const entries = await readdir(PATHS.shares);
    for (const entry of entries) {
      files.push(`${PATHS.shares}/${entry}`);
    }
  }

  if (!files.length) {
    console.log(chalk.green("Nothing to clean up. No sensitive files found."));
    return;
  }

  console.log(chalk.bold(`Destroying ${files.length} sensitive file(s)...\n`));

  for (const file of files) {
    try {
      if (hasShred) {
        execSync(`shred -fzu "${file}"`, { stdio: "ignore" });
      } else {
        const { writeFileSync, readFileSync, unlinkSync } = await import("node:fs");
        const size = readFileSync(file).length;
        writeFileSync(file, Buffer.alloc(size, 0));
        unlinkSync(file);
      }
      console.log(chalk.dim(`  Destroyed: ${file}`));
    } catch {
      console.log(chalk.yellow(`  Could not destroy: ${file}`));
    }
  }

  // Remove empty shares directory
  if (existsSync(PATHS.shares)) {
    await rm(PATHS.shares, { recursive: true, force: true });
  }

  console.log(chalk.green("\nSensitive files shredded."));
  console.log(chalk.dim("Remaining files (safe to keep): vault.json, vault.config.json"));
  console.log(chalk.dim("Also clear your shell history: history -c"));
}
