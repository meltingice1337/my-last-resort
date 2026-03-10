import { Command } from "commander";
import chalk from "chalk";
import { initCommand } from "./commands/init.js";
import { encryptCommand } from "./commands/encrypt.js";
import { splitCommand } from "./commands/split.js";
import { updateCommand } from "./commands/update.js";
import { reissueCommand } from "./commands/reissue.js";
import { decryptCommand } from "./commands/decrypt.js";
import { cleanupCommand } from "./commands/cleanup.js";

const program = new Command();

program
  .name("vault")
  .description("Emergency Vault — encrypt secrets and generate Shamir share PDFs\n\n" +
    chalk.bold("First-time setup:\n") +
    "  vault init       → configure threshold and shares\n" +
    "  vault encrypt    → encrypt plaintext.txt → vault.json\n" +
    "  vault split      → generate Shamir share PDFs\n" +
    "  vault cleanup    → shred sensitive files\n\n" +
    chalk.bold("Updating secrets:\n") +
    "  vault decrypt    → decrypt vault.json → plaintext.txt\n" +
    "  (edit plaintext.txt)\n" +
    "  vault update     → re-encrypt with same key (no new shares needed)\n" +
    "  vault cleanup    → shred sensitive files\n\n" +
    chalk.bold("Rotating keys (invalidates all shares):\n") +
    "  vault decrypt    → decrypt vault.json → plaintext.txt\n" +
    "  (edit plaintext.txt if needed)\n" +
    "  vault reissue    → new key + re-encrypt + new share PDFs\n" +
    "  vault cleanup    → shred sensitive files\n\n" +
    chalk.dim("All files are created in the current directory. Run from any folder."))
  .version("1.0.0");

program
  .command("init")
  .description("Configure threshold, shares, and recovery URL")
  .action(initCommand);

program
  .command("encrypt")
  .description("Encrypt plaintext.txt → vault.json (generates key if needed)")
  .option("-i, --input <file>", "Input plaintext file (default: plaintext.txt)")
  .action(encryptCommand);

program
  .command("split")
  .description("Split .vault-key into Shamir shares and generate PDF cards")
  .action(splitCommand);

program
  .command("decrypt")
  .description("Decrypt vault.json → plaintext.txt for editing")
  .option("-o, --output <file>", "Output file (default: plaintext.txt)")
  .action(decryptCommand);

program
  .command("update")
  .description("Re-encrypt plaintext.txt with existing key (no share redistribution)")
  .option("-i, --input <file>", "Input plaintext file (default: plaintext.txt)")
  .action(updateCommand);

program
  .command("reissue")
  .description("New key + re-encrypt + new share PDFs (invalidates ALL old shares)")
  .option("-i, --input <file>", "Input plaintext file (default: plaintext.txt)")
  .action(reissueCommand);

program
  .command("cleanup")
  .description("Shred .vault-key, plaintext.txt, and share PDFs")
  .action(cleanupCommand);

program.parse();
