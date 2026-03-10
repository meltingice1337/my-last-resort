import path from "node:path";

const WORKSPACE = "vault-workspace";

export const PATHS = {
  workspace: WORKSPACE,
  key: path.join(WORKSPACE, ".vault-key"),
  plaintext: path.join(WORKSPACE, "plaintext.txt"),
  config: path.join(WORKSPACE, "vault.config.json"),
  shares: path.join(WORKSPACE, "shares"),
  vaultOutput: "public/vault.json",
} as const;
