import { parse_share, ensureInit } from "./sss.util";

/**
 * Parse a share from a compact "vault:..." string or scanned QR data.
 * Returns {v, i, t, n, compact} or null.
 * Async because WASM must be initialized first.
 */
export async function parseShare(raw) {
  try {
    await ensureInit();
    const cleaned = typeof raw === "string" ? raw.trim() : String(raw).trim();
    const result = parse_share(cleaned);
    // parse_share returns a JS object {v, i, t, n, compact} or null
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Validate a set of parsed shares for compatibility and threshold.
 * Returns { valid, error, threshold, total } or { valid: false, error }.
 */
export function validateShareSet(shares) {
  if (!shares.length) {
    return { valid: false, error: "No shares provided" };
  }

  const { t, n, v } = shares[0];

  for (const share of shares) {
    if (share.v !== v || share.t !== t || share.n !== n) {
      return {
        valid: false,
        error: "Shares are from different vaults or configurations",
      };
    }
  }

  // Check for duplicates
  const indices = new Set(shares.map((s) => s.i));
  if (indices.size !== shares.length) {
    return { valid: false, error: "Duplicate shares detected" };
  }

  if (shares.length < t) {
    return {
      valid: false,
      error: `Need ${t} shares to decrypt, but only ${shares.length} provided`,
    };
  }

  return { valid: true, threshold: t, total: n };
}
