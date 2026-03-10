import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { VaultConfig } from "./types.js";
import { PATHS } from "./paths.js";

export function configExists(): boolean {
  return existsSync(PATHS.config);
}

export async function readConfig(): Promise<VaultConfig> {
  const raw = await readFile(PATHS.config, "utf8");
  return JSON.parse(raw) as VaultConfig;
}

export async function writeConfig(config: VaultConfig): Promise<void> {
  await writeFile(PATHS.config, JSON.stringify(config, null, 2) + "\n");
}
