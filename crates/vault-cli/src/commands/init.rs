use anyhow::Result;
use colored::Colorize;
use dialoguer::Input;

use crate::config::{self, PLAINTEXT_FILE};
use crate::types::VaultConfig;

pub fn run() -> Result<()> {
    if config::config_exists() {
        println!(
            "{}",
            "vault.config.json already exists. Delete it first to re-initialize.".yellow()
        );
        return Ok(());
    }

    println!("{}", "\nEmergency Vault — Setup\n".bold());

    let threshold: u8 = Input::new()
        .with_prompt("Minimum shares to recover (threshold)")
        .default(3)
        .interact_text()?;

    if threshold < 2 {
        println!("{}", "Threshold must be at least 2.".red());
        return Ok(());
    }

    let total_shares: u8 = Input::new()
        .with_prompt("Total number of shares")
        .default(5)
        .interact_text()?;

    if total_shares < threshold {
        println!("{}", "Total shares must be >= threshold.".red());
        return Ok(());
    }

    let repo_url: String = Input::new()
        .with_prompt("Recovery website URL (GitHub Pages)")
        .default(String::new())
        .allow_empty(true)
        .interact_text()?;

    let config = VaultConfig {
        threshold,
        total_shares,
        repo_url,
    };

    config::write_config(&config)?;

    println!("{}", "\nvault.config.json created.".green());
    println!("{}", "\nNext steps:".dimmed());
    println!(
        "{}",
        format!("  1. Create {PLAINTEXT_FILE} with your secret content").dimmed()
    );
    println!(
        "{}",
        "  2. Run 'vault encrypt' to encrypt and generate vault.json".dimmed()
    );
    println!(
        "{}",
        "  3. Run 'vault split' to generate Shamir share PDFs".dimmed()
    );
    println!(
        "{}",
        "  4. Print and distribute share PDFs to holders".dimmed()
    );
    println!(
        "{}",
        "  5. Run 'vault cleanup' to shred sensitive files".dimmed()
    );

    Ok(())
}
