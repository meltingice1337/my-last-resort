# My Last Resort

A client-side web app that uses **Shamir's Secret Sharing** to split sensitive secrets (crypto keys, passwords, recovery phrases) into multiple pieces distributed to trusted people. No single person can recover the secret alone — only when enough pieces are combined does the original secret get reconstructed.

## Why I Built This

We all have digital assets — crypto wallets, password vaults, important accounts — and the uncomfortable truth is that if something happens to us, that information can be lost forever. Handing a single person your master password is a huge trust (and security) risk. Giving it to nobody means it dies with you.

Shamir's Secret Sharing solves this elegantly: split a secret into **N pieces** and require any **K of them** to reconstruct it. Give each piece to a different trusted person. No individual piece reveals anything about the original secret — that's a mathematical guarantee, not a pinky promise. Only when the threshold is met can the secret be recovered.

I wanted a tool that:

- Runs **entirely in the browser** — no server, no uploads, no tracking
- Generates **printable PDFs** with QR codes so shares can be stored physically (paper > cloud for long-term resilience)
- Includes **multiple recovery methods** (QR scan, text paste, and even a standalone console script) so the tool itself isn't a single point of failure
- Is simple enough that non-technical people can follow the recovery instructions

## How It Works

### Creating a Recovery Plan

1. Enter your secret (a seed phrase, a password, instructions — any text)
2. Choose how many **total shares** to create (e.g., 5)
3. Choose the **threshold** — how many shares are needed to recover (e.g., 3)
4. Download a PDF for each share and distribute them to your trusted contacts

Each PDF contains:
- The share data as QR code(s)
- Step-by-step recovery instructions
- The share as plain text (QR fallback)
- A standalone JavaScript recovery script (app fallback)

### Recovering a Secret

1. Collect the required number of shares from your trusted contacts
2. Open the app and go to **Restore**
3. Scan each share's QR code with your camera, or paste the text manually
4. Once the threshold is met, the original secret is reconstructed and verified via checksum

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS |
| Cryptography | [secrets.js-grempe](https://github.com/grempe/secrets.js) (Shamir's Secret Sharing) |
| QR Generation | qrcode |
| QR Scanning | jsQR + html5-qrcode |
| PDF Generation | @react-pdf/renderer |
| Compression | pako (zlib) |
| Routing | React Router (HashRouter) |

## Running Locally

```bash
# Install dependencies
pnpm install

# Start dev server (HTTPS, port 3000)
pnpm dev

# Production build
pnpm build

# Deploy to GitHub Pages
pnpm deploy-pages
```

## Security Notes

- **Zero server communication** — all cryptographic operations happen in your browser. Nothing is sent anywhere.
- **Shamir's Secret Sharing** is information-theoretically secure: possessing fewer than the threshold number of shares reveals *zero* information about the secret. This isn't encryption that could theoretically be brute-forced — it's mathematically impossible to reconstruct without enough shares.
- **Checksum verification** ensures that the recovered secret matches the original, catching any corrupted or mismatched shares.
- Shares are **compressed** before encoding to keep QR codes scannable.
- The generated PDFs include a **fallback recovery script** so the secret can be reconstructed even if this app no longer exists.

## License

MIT
