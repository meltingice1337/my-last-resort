use std::fs;
use std::io::Write;
use std::os::unix::fs::OpenOptionsExt;
use std::path::Path;

use anyhow::Result;
use colored::Colorize;

use crate::config::{KEY_FILE, PLAINTEXT_FILE, VAULT_FILE};
use crate::crypto;
use crate::types::VaultJson;

pub fn run(output: &str) -> Result<()> {
    if !Path::new(VAULT_FILE).exists() {
        println!("{}", "vault.json not found in current directory.".red());
        println!("{}", "Run 'vault encrypt' first.".dimmed());
        return Ok(());
    }

    if !Path::new(KEY_FILE).exists() {
        println!("{}", ".vault-key not found in current directory.".red());
        println!("{}", "Place your .vault-key here to decrypt.".dimmed());
        return Ok(());
    }

    let vault_raw = fs::read_to_string(VAULT_FILE)?;
    let vault: VaultJson = serde_json::from_str(&vault_raw)?;

    let key_hex = fs::read_to_string(KEY_FILE)?;
    let key = crypto::key_from_hex(&key_hex)?;

    let Ok(plaintext) = crypto::decrypt(&vault, &key) else {
        println!(
            "{}",
            "Decryption failed — wrong key or corrupted vault.json.".red()
        );
        return Ok(());
    };

    // Write with mode 0o600
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(output)?;
    file.write_all(plaintext.as_bytes())?;

    println!("{}", format!("\nDecrypted to {output}").green());
    println!(
        "{}",
        format!("Revision: {} | Updated: {}", vault.revision, vault.updated).dimmed()
    );
    println!("{}", "\nNext steps:".dimmed());
    println!(
        "{}",
        format!("  1. Edit {PLAINTEXT_FILE} with your changes").dimmed()
    );
    println!(
        "{}",
        "  2. Run 'vault update' to re-encrypt (same key, no share redistribution)".dimmed()
    );
    println!(
        "{}",
        "  3. Run 'vault cleanup' to shred plaintext.txt and .vault-key".dimmed()
    );

    Ok(())
}
