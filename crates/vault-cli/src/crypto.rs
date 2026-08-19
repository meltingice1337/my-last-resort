use aes_gcm::aead::{Aead, Payload};
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use anyhow::{Result, bail};
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;
use rand::RngCore;
use zeroize::Zeroize;

use crate::types::VaultJson;

const IV_LENGTH: usize = 12;

/// Vault format version written by this CLI.
///
/// v1 sealed only the plaintext, leaving `version`, `revision` and `updated` as
/// unauthenticated JSON alongside it. Any authentic ciphertext could therefore be
/// relabelled with any revision and date, without the key, and still decrypt.
///
/// v2 binds those three fields into the AES-GCM tag as additional authenticated
/// data, so the metadata a holder sees is the metadata that was sealed.
pub const VAULT_VERSION: u8 = 2;

/// Canonical additional authenticated data for a v2 vault.
///
/// The recovery app builds this identical string in `src/util/crypto.util.js`.
/// The two implementations must agree byte for byte, so any change here MUST be
/// mirrored there or recovery breaks. `aad_format_is_pinned` below and the
/// golden vector in `src/util/crypto.util.test.js` pin the format from both sides.
///
/// `|` is safe as a separator: version and revision are integers and `updated`
/// is an RFC 3339 timestamp, so no field can contain one.
fn build_aad(version: u8, revision: u32, updated: &str) -> String {
    format!("emergency-vault/v2|version:{version}|revision:{revision}|updated:{updated}")
}

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

    // `updated` is sealed into the tag, so it has to be fixed before encrypting.
    let updated = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let aad = build_aad(VAULT_VERSION, revision, &updated);

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| anyhow::anyhow!("Failed to create cipher: {e}"))?;
    let nonce = Nonce::from_slice(&iv);

    // aes-gcm appends 16-byte auth tag to ciphertext (WebCrypto-compatible)
    let ciphertext_with_tag = cipher
        .encrypt(
            nonce,
            Payload {
                msg: plaintext.as_bytes(),
                aad: aad.as_bytes(),
            },
        )
        .map_err(|e| anyhow::anyhow!("Encryption failed: {e}"))?;

    Ok(VaultJson {
        version: VAULT_VERSION,
        revision,
        updated,
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

    let opened = match vault.version {
        2 => {
            let aad = build_aad(vault.version, vault.revision, &vault.updated);
            cipher.decrypt(
                nonce,
                Payload {
                    msg: ciphertext_with_tag.as_ref(),
                    aad: aad.as_bytes(),
                },
            )
        }
        // v1 is refused, not read. It sealed the plaintext alone, so accepting it
        // anywhere would let an attacker downgrade a v2 vault back to the format
        // with no metadata binding and undo the protection entirely.
        v => bail!(
            "Unsupported vault format v{v}. This CLI reads and writes v{VAULT_VERSION} only."
        ),
    };

    let mut plaintext_bytes = opened.map_err(|_| {
        anyhow::anyhow!(
            "Decryption failed. Wrong key, corrupted vault.json, or altered revision/updated metadata."
        )
    })?;

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

#[cfg(test)]
mod tests {
    use super::*;

    const KEY: [u8; 32] = [7u8; 32];

    #[test]
    fn roundtrip_writes_v2_and_recovers_plaintext() {
        let vault = encrypt("top secret", &KEY, 4).unwrap();
        assert_eq!(vault.version, 2);
        assert_eq!(vault.revision, 4);
        assert_eq!(decrypt(&vault, &KEY).unwrap(), "top secret");
    }

    #[test]
    fn rejects_a_relabelled_revision() {
        let mut vault = encrypt("top secret", &KEY, 1).unwrap();
        vault.revision = 7;
        assert!(decrypt(&vault, &KEY).is_err());
    }

    #[test]
    fn rejects_a_relabelled_updated_timestamp() {
        let mut vault = encrypt("top secret", &KEY, 1).unwrap();
        vault.updated = "2099-01-01T00:00:00.000Z".to_string();
        assert!(decrypt(&vault, &KEY).is_err());
    }

    #[test]
    fn rejects_a_downgrade_to_v1() {
        // The exact attack the binding exists to stop: serve an authentic
        // ciphertext under a version that skips the metadata binding.
        let mut vault = encrypt("top secret", &KEY, 1).unwrap();
        vault.version = 1;
        assert!(decrypt(&vault, &KEY).is_err());
    }

    #[test]
    fn rejects_an_unknown_version() {
        let mut vault = encrypt("top secret", &KEY, 1).unwrap();
        vault.version = 9;
        assert!(decrypt(&vault, &KEY).is_err());
    }

    #[test]
    fn wrong_key_still_fails() {
        let vault = encrypt("top secret", &KEY, 1).unwrap();
        assert!(decrypt(&vault, &[8u8; 32]).is_err());
    }

    #[test]
    fn refuses_a_genuine_v1_vault() {
        // A real v1 blob: correctly sealed under the same key, but with no
        // metadata bound in. Refused rather than read.
        let iv = generate_iv();
        let cipher = Aes256Gcm::new_from_slice(&KEY).unwrap();
        let sealed = cipher
            .encrypt(Nonce::from_slice(&iv), "legacy secret".as_bytes())
            .unwrap();

        let vault = VaultJson {
            version: 1,
            revision: 3,
            updated: "2026-03-17T06:27:31.771Z".to_string(),
            iv: BASE64.encode(iv),
            ciphertext: BASE64.encode(&sealed),
        };

        assert!(decrypt(&vault, &KEY).is_err());
    }

    #[test]
    fn aad_format_is_pinned() {
        // The recovery app builds this exact string. Changing it without
        // changing src/util/crypto.util.js breaks recovery.
        assert_eq!(
            build_aad(2, 7, "2026-08-19T08:22:37.711Z"),
            "emergency-vault/v2|version:2|revision:7|updated:2026-08-19T08:22:37.711Z"
        );
    }
}
