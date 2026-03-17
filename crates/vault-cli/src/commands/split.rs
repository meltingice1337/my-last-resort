use std::fs;
use std::path::Path;

use anyhow::Result;
use colored::Colorize;

use crate::config::{self, KEY_FILE, SHARES_DIR};
use crate::crypto;
use crate::pdf;

pub fn run() -> Result<()> {
    if !Path::new(KEY_FILE).exists() {
        println!(
            "{}",
            ".vault-key not found. Run 'vault encrypt' first.".red()
        );
        return Ok(());
    }

    let config = config::read_config()?;
    let key_hex = fs::read_to_string(KEY_FILE)?;
    let key = crypto::key_from_hex(&key_hex)?;

    println!(
        "{}",
        format!(
            "Splitting key into {} shares (threshold: {})...",
            config.total_shares, config.threshold
        )
        .dimmed()
    );

    let shares =
        vault_core::shamir::split_key(&key, config.threshold, config.total_shares)?;

    fs::create_dir_all(SHARES_DIR)?;

    for share in &shares {
        let filename = format!("{SHARES_DIR}/share-{}.pdf", share.i);
        pdf::generate_share_pdf(share, &config, &filename)?;
        println!("{}", format!("  Created: {filename}").green());
    }

    println!(
        "{}",
        format!(
            "\n{} share PDFs generated in {SHARES_DIR}/",
            shares.len()
        )
        .bold()
        .green()
    );
    println!("{}", "\nNext steps:".dimmed());
    println!("{}", "  1. Print each share PDF".dimmed());
    println!(
        "{}",
        "  2. Distribute one PDF to each trusted holder".dimmed()
    );
    println!(
        "{}",
        "  3. Deploy vault.json to your recovery website".dimmed()
    );
    println!(
        "{}",
        "  4. Run 'vault cleanup' to shred all sensitive files".dimmed()
    );

    Ok(())
}
