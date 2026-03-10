import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { encryptCommand } from "./commands/encrypt.js";
import { splitCommand } from "./commands/split.js";
import { updateCommand } from "./commands/update.js";
import { reissueCommand } from "./commands/reissue.js";

const program = new Command();

program
  .name("vault")
  .description("Emergency Vault — encrypt secrets and generate Shamir share PDFs")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize vault configuration (threshold, shares, holders)")
  .action(initCommand);

program
  .command("encrypt")
  .description("Encrypt plaintext and create vault.json (generates key if needed)")
  .option("-i, --input <file>", "Input plaintext file")
  .action(encryptCommand);

program
  .command("split")
  .description("Split the encryption key into Shamir shares and generate PDF cards")
  .action(splitCommand);

program
  .command("update")
  .description("Re-encrypt plaintext with existing key (no share redistribution)")
  .option("-i, --input <file>", "Input plaintext file")
  .action(updateCommand);

program
  .command("reissue")
  .description("Generate new key, re-encrypt, and create new share PDFs (invalidates old shares)")
  .option("-i, --input <file>", "Input plaintext file")
  .action(reissueCommand);

program.parse();
