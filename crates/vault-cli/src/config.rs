use std::fs;
use std::path::Path;

use anyhow::{Context, Result};

use crate::types::VaultConfig;

pub const KEY_FILE: &str = ".vault-key";
pub const PLAINTEXT_FILE: &str = "plaintext.txt";
pub const CONFIG_FILE: &str = "vault.config.json";
pub const VAULT_FILE: &str = "vault.json";
pub const SHARES_DIR: &str = "shares";

pub fn config_exists() -> bool {
    Path::new(CONFIG_FILE).exists()
}

pub fn read_config() -> Result<VaultConfig> {
    let raw = fs::read_to_string(CONFIG_FILE)
        .context("Failed to read vault.config.json")?;
    let config: VaultConfig = serde_json::from_str(&raw)
        .context("Failed to parse vault.config.json")?;
    Ok(config)
}

pub fn write_config(config: &VaultConfig) -> Result<()> {
    let json = serde_json::to_string_pretty(config)
        .context("Failed to serialize config")?;
    fs::write(CONFIG_FILE, format!("{json}\n"))
        .context("Failed to write vault.config.json")?;
    Ok(())
}
