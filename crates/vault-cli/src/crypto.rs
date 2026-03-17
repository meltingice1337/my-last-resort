use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use anyhow::{Result, bail};
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;
use rand::RngCore;
use zeroize::Zeroize;

use crate::types::VaultJson;

const IV_LENGTH: usize = 12;

pub fn generate_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    rand::rng().fill_bytes(&mut key);
    key
}

fn generate_iv() -> [u8; IV_LENGTH] {
    let mut iv = [0u8; IV_LENGTH];
    rand::rng().fill_bytes(&mut iv);
    iv
}

pub fn encrypt(plaintext: &str, key: &[u8; 32], revision: u32) -> Result<VaultJson> {
    let iv = generate_iv();

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| anyhow::anyhow!("Failed to create cipher: {e}"))?;
    let nonce = Nonce::from_slice(&iv);

    // aes-gcm appends 16-byte auth tag to ciphertext (WebCrypto-compatible)
    let ciphertext_with_tag = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| anyhow::anyhow!("Encryption failed: {e}"))?;

    Ok(VaultJson {
        version: 1,
        revision,
        updated: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        iv: BASE64.encode(iv),
        ciphertext: BASE64.encode(&ciphertext_with_tag),
    })
}

pub fn decrypt(vault: &VaultJson, key: &[u8; 32]) -> Result<String> {
    let iv = BASE64
        .decode(&vault.iv)
        .map_err(|e| anyhow::anyhow!("Failed to decode IV: {e}"))?;
    let ciphertext_with_tag = BASE64
        .decode(&vault.ciphertext)
        .map_err(|e| anyhow::anyhow!("Failed to decode ciphertext: {e}"))?;

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| anyhow::anyhow!("Failed to create cipher: {e}"))?;
    let nonce = Nonce::from_slice(&iv);

    let mut plaintext_bytes = cipher
        .decrypt(nonce, ciphertext_with_tag.as_ref())
        .map_err(|_| anyhow::anyhow!("Decryption failed — wrong key or corrupted vault.json"))?;

    let plaintext = String::from_utf8(plaintext_bytes.clone())
        .map_err(|e| anyhow::anyhow!("Decrypted data is not valid UTF-8: {e}"))?;

    plaintext_bytes.zeroize();
    Ok(plaintext)
}

pub fn key_to_hex(key: &[u8; 32]) -> String {
    hex::encode(key)
}

pub fn key_from_hex(hex_str: &str) -> Result<[u8; 32]> {
    let bytes = hex::decode(hex_str.trim())
        .map_err(|e| anyhow::anyhow!("Invalid hex key: {e}"))?;
    if bytes.len() != 32 {
        bail!("Key must be 32 bytes, got {}", bytes.len());
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&bytes);
    Ok(key)
}
