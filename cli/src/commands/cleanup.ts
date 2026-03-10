import { readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import chalk from "chalk";
import { PATHS } from "../lib/paths.js";

export async function cleanupCommand(): Promise<void> {
  if (!existsSync(PATHS.workspace)) {
    console.log(chalk.green("Nothing to clean up. vault-workspace/ does not exist."));
    return;
  }

  // Collect all files
  const files: string[] = [];
  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        files.push(full);
      }
    }
  }
  await walk(PATHS.workspace);

  if (!files.length) {
    await rm(PATHS.workspace, { recursive: true });
    console.log(chalk.green("vault-workspace/ was empty, removed."));
    return;
  }

  console.log(chalk.bold(`Destroying ${files.length} files in vault-workspace/...`));

  // Try shred first, fall back to simple overwrite + delete
  const hasShred = (() => {
    try {
      execSync("which shred", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();

  for (const file of files) {
    try {
      if (hasShred) {
        execSync(`shred -fzu "${file}"`, { stdio: "ignore" });
      } else {
        // Fallback: overwrite with zeros then delete
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

  await rm(PATHS.workspace, { recursive: true, force: true });

  console.log(chalk.green("\nvault-workspace/ shredded and destroyed."));
  console.log(chalk.dim("Also clear your shell history: history -c"));
}
