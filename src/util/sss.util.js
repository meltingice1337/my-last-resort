import secrets from "secrets.js-grempe";

export function reconstructKey(hexShares) {
  return secrets.combine(hexShares);
}
