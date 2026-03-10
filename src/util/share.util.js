/**
 * Parse a share from raw JSON string or scanned QR data.
 * Expected format: {"v":1,"i":2,"t":3,"n":5,"s":"hex..."}
 */
export function parseShare(raw) {
  try {
    // Strip all whitespace/newlines (PDF copy-paste introduces line breaks)
    const cleaned = typeof raw === "string" ? raw.replace(/\s/g, "") : raw;
    const data = typeof cleaned === "string" ? JSON.parse(cleaned) : cleaned;

    if (
      data.v !== 1 ||
      typeof data.i !== "number" ||
      typeof data.t !== "number" ||
      typeof data.n !== "number" ||
      typeof data.s !== "string" ||
      data.i < 1 ||
      data.i > data.n ||
      data.t < 2 ||
      data.t > data.n ||
      !data.s.length
    ) {
      return null;
    }

    return data;
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
