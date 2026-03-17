mod commands;
mod config;
mod crypto;
mod pdf;
mod types;

use clap::{Parser, Subcommand};
use colored::Colorize;

#[derive(Parser)]
#[command(
    name = "vault",
    about = format!(
        "Emergency Vault — encrypt secrets and generate Shamir share PDFs\n\n\
        {}\n  \
        vault init       → configure threshold and shares\n  \
        vault encrypt    → encrypt plaintext.txt → vault.json\n  \
        vault split      → generate Shamir share PDFs\n  \
        vault cleanup    → shred sensitive files\n\n\
        {}\n  \
        vault decrypt    → decrypt vault.json → plaintext.txt\n  \
        (edit plaintext.txt)\n  \
        vault update     → re-encrypt with same key (no new shares needed)\n  \
        vault cleanup    → shred sensitive files\n\n\
        {}\n  \
        vault decrypt    → decrypt vault.json → plaintext.txt\n  \
        (edit plaintext.txt if needed)\n  \
        vault reissue    → new key + re-encrypt + new share PDFs\n  \
        vault cleanup    → shred sensitive files\n\n\
        All files are created in the current directory. Run from any folder.",
        "First-time setup:".bold(),
        "Updating secrets:".bold(),
        "Rotating keys (invalidates all shares):".bold()
    ),
    version = "2.0.0"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Configure threshold, shares, and recovery URL
    Init,

    /// Encrypt plaintext.txt → vault.json (generates key if needed)
    Encrypt {
        /// Input plaintext file
        #[arg(short, long, default_value = "plaintext.txt")]
        input: String,
    },

    /// Split .vault-key into Shamir shares and generate PDF cards
    Split,

    /// Decrypt vault.json → plaintext.txt for editing
    Decrypt {
        /// Output file
        #[arg(short, long, default_value = "plaintext.txt")]
        output: String,
    },

    /// Re-encrypt plaintext.txt with existing key (no share redistribution)
    Update {
        /// Input plaintext file
        #[arg(short, long, default_value = "plaintext.txt")]
        input: String,
    },

    /// New key + re-encrypt + new share PDFs (invalidates ALL old shares)
    Reissue {
        /// Input plaintext file
        #[arg(short, long, default_value = "plaintext.txt")]
        input: String,
    },

    /// Shred .vault-key, plaintext.txt, and share PDFs
    Cleanup,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Init => commands::init::run()?,
        Commands::Encrypt { input } => commands::encrypt::run(&input)?,
        Commands::Split => commands::split::run()?,
        Commands::Decrypt { output } => commands::decrypt::run(&output)?,
        Commands::Update { input } => commands::update::run(&input)?,
        Commands::Reissue { input } => commands::reissue::run(&input)?,
        Commands::Cleanup => commands::cleanup::run()?,
    }

    Ok(())
}
