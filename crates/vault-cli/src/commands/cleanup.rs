use std::fs;
use std::path::Path;
use std::process::Command;

use anyhow::Result;
use colored::Colorize;

use crate::config::{KEY_FILE, PLAINTEXT_FILE, SHARES_DIR};

fn has_shred() -> bool {
    Command::new("which")
        .arg("shred")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn destroy_file(path: &str, use_shred: bool) {
    let result = if use_shred {
        Command::new("shred")
            .args(["-fzu", path])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else {
        // Fallback: overwrite with zeros then delete
        (|| -> std::io::Result<bool> {
            let metadata = fs::metadata(path)?;
            let size = metadata.len() as usize;
            fs::write(path, vec![0u8; size])?;
            fs::remove_file(path)?;
            Ok(true)
        })()
        .unwrap_or(false)
    };

    if result {
        println!("{}", format!("  Destroyed: {path}").dimmed());
    } else {
        println!("{}", format!("  Could not destroy: {path}").yellow());
    }
}

pub fn run() -> Result<()> {
    let use_shred = has_shred();
    let mut files: Vec<String> = Vec::new();

    // Collect sensitive files
    for f in [KEY_FILE, PLAINTEXT_FILE] {
        if Path::new(f).exists() {
            files.push(f.to_string());
        }
    }

    // Collect share PDFs
    if Path::new(SHARES_DIR).exists()
        && let Ok(entries) = fs::read_dir(SHARES_DIR)
    {
        for entry in entries.flatten() {
            files.push(entry.path().to_string_lossy().to_string());
        }
    }

    if files.is_empty() {
        println!(
            "{}",
            "Nothing to clean up. No sensitive files found.".green()
        );
        return Ok(());
    }

    println!(
        "{}",
        format!("Destroying {} sensitive file(s)...\n", files.len()).bold()
    );

    for file in &files {
        destroy_file(file, use_shred);
    }

    // Remove empty shares directory
    if Path::new(SHARES_DIR).exists() {
        let _ = fs::remove_dir_all(SHARES_DIR);
    }

    println!("{}", "\nSensitive files shredded.".green());
    println!(
        "{}",
        "Remaining files (safe to keep): vault.json, vault.config.json".dimmed()
    );
    println!("{}", "Also clear your shell history: history -c".dimmed());

    Ok(())
}
