use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultConfig {
    pub threshold: u8,
    pub total_shares: u8,
    pub repo_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultJson {
    pub version: u8,
    pub revision: u32,
    pub updated: String,
    pub iv: String,
    pub ciphertext: String,
}
