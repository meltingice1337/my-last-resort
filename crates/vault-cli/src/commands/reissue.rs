use std::fs;
use std::os::unix::fs::OpenOptionsExt;
use std::path::Path;

use anyhow::Result;
use colored::Colorize;
use dialoguer::Input;

use crate::config::{self, KEY_FILE, SHARES_DIR, VAULT_FILE};
use crate::crypto;
use crate::pdf;

pub fn run(input: &str) -> Result<()> {
    if !Path::new(input).exists() {
        println!("{}", format!("Input file not found: {input}").red());
        return Ok(());
    }

    println!(
        "{}",
        "\nWARNING: This generates a NEW encryption key.".bold().yellow()
    );
    println!(
        "{}",
        "All existing shares will become INVALID.".yellow()
    );
    println!(
        "{}",
        "You must redistribute ALL new share PDFs.\n".yellow()
    );

    let confirm: String = Input::new()
        .with_prompt("Type YES to continue")
        .interact_text()?;

    if confirm.trim() != "YES" {
        println!("{}", "Cancelled.".dimmed());
        return Ok(());
    }

    let config = config::read_config()?;
    let plaintext = fs::read_to_string(input)?;
    if plaintext.trim().is_empty() {
        println!("{}", "Input file is empty.".red());
        return Ok(());
    }

    // Generate new key
    let key = crypto::generate_key();
    let hex = crypto::key_to_hex(&key);
    {
        use std::io::Write;
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(KEY_FILE)?;
        file.write_all(format!("{hex}\n").as_bytes())?;
    }
    println!("{}", "Generated new .vault-key".green());

    // Re-encrypt — revision resets to 1 on reissue
    let vault = crypto::encrypt(&plaintext, &key, 1)?;
    let json = serde_json::to_string_pretty(&vault)?;
    fs::write(VAULT_FILE, format!("{json}\n"))?;
    println!(
        "{}",
        format!("Encrypted vault written to {VAULT_FILE}").green()
    );
    println!(
        "{}",
        format!("Revision: 1 | Updated: {}", vault.updated).dimmed()
    );

    // Split new key
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
            "\nReissue complete. {} new share PDFs generated.",
            shares.len()
        )
        .bold()
        .green()
    );
    println!(
        "{}",
        "Old shares are now INVALID. Collect and destroy them."
            .bold()
            .red()
    );
    println!("{}", "\nNext steps:".dimmed());
    println!("{}", "  1. Print each new share PDF".dimmed());
    println!(
        "{}",
        "  2. Distribute to holders and collect/destroy old shares".dimmed()
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
