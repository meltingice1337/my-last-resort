# Emergency Vault

A two-part system for securely passing sensitive secrets (crypto keys, passwords, recovery phrases) to trusted people using **Shamir's Secret Sharing** and **AES-256-GCM encryption**.

A **CLI tool** encrypts your secret and splits the encryption key into shares distributed as printed PDF cards. A **web app** lets share holders scan their QR codes, reconstruct the key, and decrypt the vault.

## Why This Exists

We all have digital assets — crypto wallets, password vaults, important accounts — and if something happens to us, that information can be lost forever. Handing a single person your master password is a huge trust (and security) risk. Giving it to nobody means it dies with you.

Shamir's Secret Sharing solves this: split a secret into **N pieces** and require any **K of them** to reconstruct it. No individual piece reveals anything about the original — that's a mathematical guarantee.

## Architecture

```
CLI (vault owner):
  plaintext → AES-256-GCM(random 256-bit key) → public/vault.json
  key → Shamir K-of-N → N shares → N printed PDF cards

Web App (share holders):
  K shares (scanned/pasted) → Shamir reconstruct → key
  key + vault.json (fetched) → AES-256-GCM decrypt → plaintext
```

**Key design decisions:**

- The secret is **encrypted** with a random AES-256-GCM key, then the **key** is split via Shamir — not the secret itself. This means updating a secret just re-encrypts with the same key; no share redistribution needed.
- Shares are only ~130 characters (just the 32-byte key), so each fits in a **single QR code** — no multi-part scanning.
- The encrypted vault (`vault.json`) is safe to host publicly. Without enough shares, it's indistinguishable from random data.
- All sensitive files (key, plaintext, PDFs) live in a single `vault-workspace/` directory for easy secure cleanup.

## CLI: Creating a Vault

The CLI runs on your machine (ideally a live USB — see [Security](#security) below).

```bash
# Install everything
pnpm install

# Interactive setup — threshold, shares, holder names
pnpm vault init

# Put your secret in the workspace
echo "your secret seed phrase here" > vault-workspace/plaintext.txt

# Encrypt → creates public/vault.json + vault-workspace/.vault-key
pnpm vault encrypt

# Split key into Shamir shares → PDF cards in vault-workspace/shares/
pnpm vault split

# Print the PDFs, hand them to holders, then:
pnpm vault:cleanup    # shreds and deletes vault-workspace/
```

### Other CLI Commands

```bash
# Re-encrypt with same key (update secret, no share redistribution)
pnpm vault update

# Nuclear option: new key + new vault + new shares (old shares become invalid)
pnpm vault reissue
```

### What Gets Created

```
vault-workspace/           # ALL sensitive files — one folder
├── .vault-key             # 256-bit AES key (hex)
├── plaintext.txt          # your secret
├── vault.config.json      # threshold, shares, holder info
└── shares/                # generated PDF cards
    ├── share-1-Alice.pdf
    ├── share-2-Bob.pdf
    └── ...

public/
└── vault.json             # encrypted blob (safe to deploy)
```

### PDF Share Cards

Each PDF is 3 pages:
1. **Share card** — QR code, plain text fallback, holder name, confidential warning
2. **Recovery instructions** — step-by-step guide, all holder contacts, security reminders
3. **Manual recovery script** — standalone browser console JS that loads the Shamir library from CDN and decrypts, in case the web app ever goes offline

## Web App: Recovering a Secret

The web app is recovery-only. Share holders visit it when they need to reconstruct the secret.

1. Gather enough share holders (the threshold — e.g., 3 of 5)
2. Open the web app
3. Each holder scans their QR code or pastes the JSON from their PDF
4. Once the threshold is met, click **Decrypt**
5. The app fetches `vault.json`, reconstructs the AES key from the shares, and decrypts

Everything runs client-side. Nothing is sent to any server.

```bash
# Dev server (HTTPS required for camera access)
pnpm dev

# Deploy to GitHub Pages
pnpm deploy-pages
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| CLI | TypeScript, Commander, tsup |
| Encryption | AES-256-GCM (Node `crypto` / WebCrypto `crypto.subtle`) |
| Secret Sharing | [secrets.js-grempe](https://github.com/grempe/secrets.js) |
| PDF Generation | pdf-lib + qrcode |
| Web Framework | React 19 + Vite |
| Styling | Tailwind CSS 4 |
| QR Scanning | jsQR |
| Workspace | pnpm monorepo |

## Security

### Cryptographic Guarantees

- **Shamir's Secret Sharing** is information-theoretically secure: fewer than K shares reveal *zero* information about the key. This isn't encryption that could be brute-forced — it's mathematically impossible.
- **AES-256-GCM** provides authenticated encryption. Tampering with `vault.json` is detected on decryption.
- The web app uses the **WebCrypto API** (`crypto.subtle`), the browser's native cryptographic implementation.

### Operational Security

**For maximum security, run the CLI on a live USB Linux (e.g., [Tails](https://tails.net)):**

1. Flash Tails to a USB stick
2. Boot from it, skip network setup (you don't need internet)
3. Clone or copy the repo from a second USB
4. Run `pnpm install`, then the vault commands
5. Print PDFs to a USB-connected printer (not a network printer)
6. Shut down — RAM is wiped, nothing was ever written to disk

**If running on your normal machine:**

- `pnpm vault:cleanup` shreds all files in `vault-workspace/` (overwrites with random data before deleting)
- Clear your shell history afterward: `history -c`
- Note: on SSDs, `shred` isn't 100% guaranteed due to wear-leveling. A live USB avoids this entirely.

### What's Safe to Commit

- `public/vault.json` — encrypted blob, safe to host publicly
- All source code — no secrets embedded
- `vault-workspace/` is gitignored

## License

MIT
