use std::fs;
use std::path::Path;

use anyhow::Result;
use colored::Colorize;

use crate::commands::encrypt::get_current_revision;
use crate::config::{KEY_FILE, VAULT_FILE};
use crate::crypto;

pub fn run(input: &str) -> Result<()> {
    if !Path::new(KEY_FILE).exists() {
        println!("{}", ".vault-key not found. Run 'vault encrypt' first.".red());
        println!(
            "{}",
            "Use 'vault reissue' if you need to generate a new key.".dimmed()
        );
        return Ok(());
    }

    if !Path::new(input).exists() {
        println!("{}", format!("Input file not found: {input}").red());
        return Ok(());
    }

    let plaintext = fs::read_to_string(input)?;
    if plaintext.trim().is_empty() {
        println!("{}", "Input file is empty.".red());
        return Ok(());
    }

    let key_hex = fs::read_to_string(KEY_FILE)?;
    let key = crypto::key_from_hex(&key_hex)?;

    let revision = get_current_revision() + 1;
    let vault = crypto::encrypt(&plaintext, &key, revision)?;

    let json = serde_json::to_string_pretty(&vault)?;
    fs::write(VAULT_FILE, format!("{json}\n"))?;

    println!(
        "{}",
        format!("\nvault.json updated (same key — no share redistribution needed)").green()
    );
    println!(
        "{}",
        format!("Revision: {} | Updated: {}", vault.revision, vault.updated).dimmed()
    );
    println!("{}", "\nNext steps:".dimmed());
    println!(
        "{}",
        "  1. Deploy vault.json to your recovery website".dimmed()
    );
    println!(
        "{}",
        "  2. Run 'vault cleanup' to shred plaintext.txt and .vault-key".dimmed()
    );

    Ok(())
}
