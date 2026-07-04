# Emergency Vault

A two-part system for securely passing sensitive secrets (crypto keys, passwords, recovery phrases) to trusted people using **Shamir's Secret Sharing** and **AES-256-GCM encryption**.

A **CLI tool** encrypts your secret and splits the encryption key into shares distributed as printed PDF cards. A **web app** lets share holders scan their QR codes, reconstruct the key, and decrypt the vault.

## Prerequisites

Install these before building:

- **Rust** (stable), via [rustup](https://rustup.rs). Needed for the CLI and for the web app's WASM crypto module.
- **Node.js 18+ and pnpm 10+**. Needed for the web app. Run `npm i -g pnpm` if you don't have pnpm.
- **wasm-pack** plus the **wasm32 target**. Needed only to build or deploy the web app, which compiles the Rust crypto to WASM.

### Building only the CLI

You just need Rust:

```bash
cargo build --release -p vault-cli
```

wasm-pack is not required for the CLI.

### Building or deploying the web app

One-time toolchain setup:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack        # compiles from source, takes a few minutes
pnpm install                   # web dependencies
```

Or run all of it at once with `pnpm bootstrap`.

If `wasm-pack` is missing you'll see `sh: 1: wasm-pack: not found` during `pnpm build` or `pnpm web:deploy`. The fix is the setup above.

## Quickstart: What You Actually Do

There are three moments in this vault's life: **set it up once**, **update your secret later**, and (for your holders) **recover it**. Here is each, step by step.

> Examples below call the binary `vault`. That is shorthand for `./target/release/vault` unless you've put it on your `PATH`.

### 1. One-time setup (create the vault, hand out cards)

1. Build the CLI: `cargo build --release -p vault-cli` (binary lands at `target/release/vault`).
2. Configure the vault: `vault init` (interactive: threshold K, total shares N, recovery website URL). Writes `vault.config.json`.
3. Put your secret in `plaintext.txt`: `echo "your seed phrase here" > plaintext.txt`.
4. Encrypt it: `vault encrypt`. Creates `vault.json` (the public, encrypted blob) and `.vault-key` (the secret AES key).
5. Make the share cards: `vault split`. Writes `shares/share-1.pdf` ... `shares/share-N.pdf`, one QR card per holder.
6. Print the PDFs and give one to each trusted holder.
7. Publish `vault.json` (see step 4 below).
8. Decide whether to keep `.vault-key` (see the warning below), then run `vault cleanup` to shred the sensitive files.

### 2. Update your secret later (same key, cards stay valid)

You need both `.vault-key` and `vault.json` in the current directory for this. If you shredded `.vault-key`, skip to "Rotate the key" below.

1. Decrypt the current secret: `vault decrypt`. Writes `plaintext.txt` (needs `.vault-key`).
2. Edit `plaintext.txt` with your changes.
3. Re-encrypt with the same key: `vault update`. Bumps the revision; every printed card stays valid, no redistribution.
4. Publish the new `vault.json` (see step 4 below).
5. Run `vault cleanup` to shred `plaintext.txt` again.

### 3. Recover the secret (this is for your holders, not you)

1. K holders gather and open the recovery website.
2. Each scans their QR code or pastes their `vault:...` string.
3. Once K shares are present, click **Decrypt**. The site reconstructs the key and decrypts `vault.json` in the browser.

Holders **never need `.vault-key`.** Reconstructing the key from K shares is the whole point.

### 4. Publish the vault (make the new vault.json live)

1. Stage it into the web app: `pnpm vault:stage` (copies `vault.json` to `public/vault.json`).
2. Commit it: `git add public/vault.json && git commit -m "vault: new revision"`.
3. Deploy the site: `pnpm web:deploy` (pushes HEAD, builds, then publishes to GitHub Pages).

### ⚠️ Keep your `.vault-key` if you ever want to update

`vault decrypt` and `vault update` both **require `.vault-key`**, and `vault cleanup` **shreds it** along with `plaintext.txt` and the PDFs. There is no command that rebuilds the key from shares. So once the key is gone, you can no longer update your secret in place: your only option becomes `vault reissue`, which mints a new key and **invalidates every card you already handed out**, forcing a full reprint and redistribution.

- **Plan to update your secret over time?** Back up `.vault-key` somewhere safe (password manager, encrypted USB) before `vault cleanup`.
- **Secret will never change?** Let `cleanup` shred it. Your holders can still recover from their cards regardless.

### Rotate the key (lost `.vault-key`, or key possibly compromised)

Run `vault reissue`: it generates a new key, re-encrypts the secret, and produces a fresh set of share PDFs. All old cards become invalid, so collect and destroy them, then publish the new `vault.json` and hand out the new cards.

## Why This Exists

We all have digital assets — crypto wallets, password vaults, important accounts — and if something happens to us, that information can be lost forever. Handing a single person your master password is a huge trust (and security) risk. Giving it to nobody means it dies with you.

Shamir's Secret Sharing solves this: split a secret into **N pieces** and require any **K of them** to reconstruct it. No individual piece reveals anything about the original — that's a mathematical guarantee.

## Architecture

```
CLI (vault owner, Rust binary):
  plaintext → AES-256-GCM(random 256-bit key) → vault.json
  key → Shamir K-of-N (blahaj) → N shares → N printed PDF cards

Web App (share holders, React + WASM):
  K shares (scanned/pasted) → WASM Shamir reconstruct → key
  key + vault.json (fetched) → WebCrypto AES-GCM decrypt → plaintext
```

**Key design decisions:**

- The secret is **encrypted** with a random AES-256-GCM key, then the **key** is split via Shamir — not the secret itself. This means updating a secret just re-encrypts with the same key; no share redistribution needed.
- Shares fit in a **single QR code** — no multi-part scanning.
- The encrypted vault (`vault.json`) is safe to host publicly. Without enough shares, it's indistinguishable from random data.
- The CLI and web app share the same Shamir implementation (Rust `blahaj` crate) compiled to native + WASM.
- **Compact share format**: shares are encoded as `vault:` + base58check (binary header + raw share bytes). No JSON, no base64 — just a single alphanumeric string (~62 chars) that's easy to hand-copy from paper. Built-in checksum catches transcription errors.

## Monorepo Structure

```
my-last-resort/
├── Cargo.toml                  # Rust workspace root
├── crates/
│   ├── vault-core/             # Shared: Shamir (blahaj), types, serialization
│   ├── vault-wasm/             # WASM bindings for vault-core
│   └── vault-cli/              # CLI binary (2.2MB)
├── packages/
│   └── vault-wasm/             # wasm-pack output (generated, gitignored)
├── src/                        # React web app (recovery)
├── package.json                # pnpm workspace
└── vite.config.js              # Vite + WASM plugins
```

## CLI: Creating a Vault

The CLI is a small (~2MB) Rust binary. Build it with `cargo build --release -p vault-cli`.

```bash
# Build the CLI
cargo build --release -p vault-cli

# Interactive setup — threshold, shares, recovery URL
./target/release/vault init

# Put your secret in the current directory
echo "your secret seed phrase here" > plaintext.txt

# Encrypt → creates vault.json + .vault-key
./target/release/vault encrypt

# Split key into Shamir shares → PDF cards in shares/
./target/release/vault split

# Print the PDFs, hand them to holders, then:
./target/release/vault cleanup    # shreds sensitive files
```

### Other CLI Commands

```bash
# Decrypt vault.json back to plaintext for editing
./target/release/vault decrypt

# Re-encrypt with same key (update secret, no share redistribution)
./target/release/vault update

# Nuclear option: new key + new vault + new shares (old shares become invalid)
./target/release/vault reissue
```

### What Gets Created

```
.vault-key             # 256-bit AES key (hex) — SENSITIVE
plaintext.txt          # your secret — SENSITIVE
vault.config.json      # threshold, shares, recovery URL
vault.json             # encrypted blob (safe to deploy)
shares/                # generated PDF cards — SENSITIVE
├── share-1.pdf
├── share-2.pdf
└── ...
```

### PDF Share Cards

Each PDF is 3 pages:
1. **Share card** — QR code, plain text fallback, confidential warning
2. **Recovery instructions** — step-by-step guide, security reminders
3. **Manual recovery script** — standalone browser console JS using WASM module for offline decryption

## Web App: Recovering a Secret

The web app is recovery-only. Share holders visit it when they need to reconstruct the secret.

1. Gather enough share holders (the threshold — e.g., 3 of 5)
2. Open the web app
3. Each holder scans their QR code or pastes the `vault:...` string from their PDF
4. Once the threshold is met, click **Decrypt**
5. The app fetches `vault.json`, reconstructs the AES key from the shares (via WASM), and decrypts (via WebCrypto)

Everything runs client-side. Nothing is sent to any server.

```bash
# Dev server (HTTPS required for camera access — builds WASM first)
pnpm dev

# Deploy to GitHub Pages
pnpm web:deploy
```

## Releasing

Pushing a version tag to GitHub triggers a CI workflow that builds the Linux CLI binary and creates a GitHub Release with the artifact attached.

```bash
# Bump version in crates/vault-cli/Cargo.toml, commit, then:
pnpm cli:release    # reads version from Cargo.toml, creates + pushes a git tag

# GitHub Actions builds the binary and publishes the release automatically.
```

### Scripts Reference

| Script | What it does |
|--------|-------------|
| `pnpm bootstrap` | One-time toolchain setup: wasm32 target + wasm-pack + web deps |
| `pnpm dev` | Build WASM + start Vite dev server |
| `pnpm build` | Build WASM + production Vite build |
| `pnpm web:deploy` | Full build + deploy to GitHub Pages |
| `pnpm cli:build` | Build CLI binary (`target/release/vault`) |
| `pnpm wasm:build` | Build WASM package only |
| `pnpm cli:release` | Tag current version + push tag (triggers CI release) |
| `pnpm vault:stage` | Copy `vault.json` to `public/vault.json` before deploy |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| CLI | Rust, clap, aes-gcm, printpdf |
| Shared Shamir | Rust `blahaj` crate (vault-core) |
| WASM Bridge | wasm-bindgen, wasm-pack |
| Encryption | AES-256-GCM (Rust `aes-gcm` / WebCrypto `crypto.subtle`) |
| PDF Generation | printpdf + qrcode |
| Web Framework | React 19 + Vite |
| Styling | Tailwind CSS 4 |
| QR Scanning | jsQR |
| Workspace | Cargo workspace + pnpm |

## Security

### Cryptographic Guarantees

- **Shamir's Secret Sharing** is information-theoretically secure: fewer than K shares reveal *zero* information about the key. This isn't encryption that could be brute-forced — it's mathematically impossible.
- **AES-256-GCM** provides authenticated encryption. Tampering with `vault.json` is detected on decryption.
- The web app uses the **WebCrypto API** (`crypto.subtle`), the browser's native cryptographic implementation.
- The `blahaj` crate is a maintained fork of `sharks`, which had a security vulnerability ([RUSTSEC-2024-0398](https://rustsec.org/advisories/RUSTSEC-2024-0398.html)).

### Operational Security

**For maximum security, run the CLI on a live USB Linux (e.g., [Tails](https://tails.net)):**

1. Flash Tails to a USB stick
2. Boot from it, skip network setup (you don't need internet)
3. Copy the pre-built `vault` binary from a second USB
4. Run the vault commands
5. Print PDFs to a USB-connected printer (not a network printer)
6. Shut down — RAM is wiped, nothing was ever written to disk

**If running on your normal machine:**

- `vault cleanup` shreds all sensitive files (overwrites with zeros before deleting, or uses `shred` on Linux)
- Clear your shell history afterward: `history -c`
- Note: on SSDs, `shred` isn't 100% guaranteed due to wear-leveling. A live USB avoids this entirely.

### What's Safe to Commit

- `vault.json` — encrypted blob, safe to host publicly
- All source code — no secrets embedded
- `.vault-key`, `plaintext.txt`, `shares/` are gitignored

## Recovery telemetry (optional)

The recovery app can beacon page/decrypt events to a self-hosted collector
(`vault-canary`). To enable, create `.env.production.local` (untracked) with:

    VITE_COLLECTOR_URL=https://canary.<domain>/e

Then deploy as usual (`pnpm run web:deploy`). Vite auto-loads
`.env.production.local` for production builds. With the variable unset, the app
sends nothing. Beacons carry only metadata (event name, session id, counts,
revision), never shares, keys, or plaintext.

## License

MIT
