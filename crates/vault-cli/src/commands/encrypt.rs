use std::fs;
use std::os::unix::fs::OpenOptionsExt;
use std::path::Path;

use anyhow::Result;
use colored::Colorize;

use crate::config::{KEY_FILE, PLAINTEXT_FILE, VAULT_FILE};
use crate::crypto;
use crate::types::VaultJson;

pub fn get_current_revision() -> u32 {
    fs::read_to_string(VAULT_FILE)
        .ok()
        .and_then(|raw| serde_json::from_str::<VaultJson>(&raw).ok())
        .map(|v| v.revision)
        .unwrap_or(0)
}

pub fn run(input: &str) -> Result<()> {
    if !Path::new(input).exists() {
        println!("{}", format!("Input file not found: {input}").red());
        println!(
            "{}",
            format!("Create {PLAINTEXT_FILE} or use --input <path>").dimmed()
        );
        return Ok(());
    }

    let plaintext = fs::read_to_string(input)?;
    if plaintext.trim().is_empty() {
        println!("{}", "Input file is empty.".red());
        return Ok(());
    }

    let key: [u8; 32] = if Path::new(KEY_FILE).exists() {
        let key_hex = fs::read_to_string(KEY_FILE)?;
        println!("{}", "Using existing .vault-key".dimmed());
        crypto::key_from_hex(&key_hex)?
    } else {
        let key = crypto::generate_key();
        // Write with mode 0o600
        let hex = crypto::key_to_hex(&key);
        fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(KEY_FILE)?
            .write_all_using(&format!("{hex}\n"))?;
        println!("{}", "Generated new .vault-key".green());
        key
    };

    let revision = get_current_revision() + 1;
    let vault = crypto::encrypt(&plaintext, &key, revision)?;

    let json = serde_json::to_string_pretty(&vault)?;
    fs::write(VAULT_FILE, format!("{json}\n"))?;

    println!(
        "{}",
        format!("\nEncrypted vault written to {VAULT_FILE}").green()
    );
    println!(
        "{}",
        format!("Revision: {} | Updated: {}", vault.revision, vault.updated).dimmed()
    );
    println!("{}", "\nNext steps:".dimmed());
    println!(
        "{}",
        "  1. Run 'vault split' to generate Shamir share PDFs".dimmed()
    );
    println!(
        "{}",
        "  2. Print and distribute share PDFs to holders".dimmed()
    );
    println!(
        "{}",
        "  3. Run 'vault cleanup' to shred plaintext.txt and .vault-key".dimmed()
    );
    println!(
        "{}",
        "\nTo update later: 'vault decrypt' → edit plaintext.txt → 'vault update'".dimmed()
    );

    Ok(())
}

trait WriteAll {
    fn write_all_using(&mut self, data: &str) -> Result<()>;
}

impl WriteAll for fs::File {
    fn write_all_using(&mut self, data: &str) -> Result<()> {
        use std::io::Write;
        self.write_all(data.as_bytes())?;
        Ok(())
    }
}
