export interface VaultConfig {
  threshold: number;
  totalShares: number;
  repoUrl: string;
}

export interface VaultJson {
  version: 1;
  revision: number;
  updated: string;
  iv: string; // base64
  ciphertext: string; // base64 (ciphertext + auth tag)
}

export interface SharePayload {
  v: 1;
  i: number; // 1-based share index
  t: number; // threshold
  n: number; // total shares
  s: string; // hex share string
}
