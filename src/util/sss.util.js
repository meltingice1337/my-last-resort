import init, { combine_shares, parse_share } from "vault-wasm";

const ready = init();

export { parse_share };

export async function ensureInit() {
  await ready;
}

export async function reconstructKey(shares) {
  await ready;
  // shares = [{v, i, t, n, compact}, ...] — extract compact strings
  const compactStrings = shares.map((s) => s.compact);
  return combine_shares(JSON.stringify(compactStrings));
}
