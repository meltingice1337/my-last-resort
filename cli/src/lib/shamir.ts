import secrets from "secrets.js-grempe";
import type { SharePayload } from "./types.js";

export function splitKey(
  keyHex: string,
  totalShares: number,
  threshold: number,
): SharePayload[] {
  const shares = secrets.share(keyHex, totalShares, threshold);

  return shares.map((s: string, idx: number) => ({
    v: 1 as const,
    i: idx + 1,
    t: threshold,
    n: totalShares,
    s,
  }));
}

export function reconstructKey(hexShares: string[]): string {
  return secrets.combine(hexShares);
}
