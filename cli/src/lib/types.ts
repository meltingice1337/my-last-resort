export interface Holder {
  name: string;
  contact: string;
}

export interface VaultConfig {
  threshold: number;
  totalShares: number;
  repoUrl: string;
  holders: Holder[];
}

export interface VaultJson {
  version: 1;
  updated: string;
  iv: string; // base64
  ciphertext: string; // base64 (ciphertext + auth tag)
  hint?: string;
}

export interface SharePayload {
  v: 1;
  i: number; // 1-based share index
  t: number; // threshold
  n: number; // total shares
  s: string; // hex share string
}
