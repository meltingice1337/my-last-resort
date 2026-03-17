use blahaj::{Share, Sharks};
use std::collections::HashSet;

use crate::error::CoreError;
use crate::types::{SharePayload, ShareSetInfo};

pub fn split_key(key: &[u8], threshold: u8, total: u8) -> Result<Vec<SharePayload>, CoreError> {
    if threshold < 2 {
        return Err(CoreError::InvalidShare("threshold must be >= 2".into()));
    }
    if total < threshold {
        return Err(CoreError::InvalidShare(
            "total shares must be >= threshold".into(),
        ));
    }

    let sharks = Sharks(threshold);
    let dealer = sharks.dealer(key);

    let shares: Vec<SharePayload> = dealer
        .take(total as usize)
        .enumerate()
        .map(|(idx, share)| {
            let bytes: Vec<u8> = Vec::from(&share);
            SharePayload {
                v: 2,
                i: (idx + 1) as u8,
                t: threshold,
                n: total,
                share_bytes: bytes,
            }
        })
        .collect();

    Ok(shares)
}

pub fn combine_shares(shares: &[SharePayload]) -> Result<Vec<u8>, CoreError> {
    validate_share_set(shares)?;

    let threshold = shares[0].t;
    if shares.len() < threshold as usize {
        return Err(CoreError::InsufficientShares {
            needed: threshold,
            got: shares.len(),
        });
    }

    let shark_shares: Vec<Share> = shares
        .iter()
        .map(|sp| {
            Share::try_from(sp.share_bytes.as_slice())
                .map_err(|e| CoreError::InvalidShare(format!("invalid share bytes: {e}")))
        })
        .collect::<Result<Vec<_>, _>>()?;

    let sharks = Sharks(threshold);
    let secret = sharks
        .recover(&shark_shares)
        .map_err(|e| CoreError::RecoveryFailed(e.to_string()))?;

    Ok(secret)
}

pub fn validate_share_set(shares: &[SharePayload]) -> Result<ShareSetInfo, CoreError> {
    if shares.is_empty() {
        return Err(CoreError::InsufficientShares { needed: 1, got: 0 });
    }

    let first = &shares[0];
    let mut indices = HashSet::new();

    for share in shares {
        if share.v != first.v {
            return Err(CoreError::IncompatibleShares(format!(
                "version mismatch: {} vs {}",
                share.v, first.v
            )));
        }
        if share.t != first.t || share.n != first.n {
            return Err(CoreError::IncompatibleShares(
                "shares from different configurations".into(),
            ));
        }
        if !indices.insert(share.i) {
            return Err(CoreError::DuplicateShare(share.i));
        }
    }

    Ok(ShareSetInfo {
        threshold: first.t,
        total: first.n,
        count: shares.len(),
        ready: shares.len() >= first.t as usize,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_and_combine_roundtrip() {
        let key = b"0123456789abcdef0123456789abcdef"; // 32 bytes
        let shares = split_key(key, 3, 5).unwrap();

        assert_eq!(shares.len(), 5);
        for (i, share) in shares.iter().enumerate() {
            assert_eq!(share.v, 2);
            assert_eq!(share.i, (i + 1) as u8);
            assert_eq!(share.t, 3);
            assert_eq!(share.n, 5);
        }

        // Combine with exactly threshold shares
        let subset = &shares[0..3];
        let recovered = combine_shares(subset).unwrap();
        assert_eq!(recovered, key);
    }

    #[test]
    fn test_combine_with_different_subsets() {
        let key = b"0123456789abcdef0123456789abcdef";
        let shares = split_key(key, 3, 5).unwrap();

        // Different subset
        let subset = vec![shares[1].clone(), shares[3].clone(), shares[4].clone()];
        let recovered = combine_shares(&subset).unwrap();
        assert_eq!(recovered, key);
    }

    #[test]
    fn test_insufficient_shares() {
        let key = b"0123456789abcdef0123456789abcdef";
        let shares = split_key(key, 3, 5).unwrap();

        let subset = &shares[0..2];
        let result = combine_shares(subset);
        assert!(result.is_err());
    }

    #[test]
    fn test_share_encode_decode_roundtrip() {
        let key = b"0123456789abcdef0123456789abcdef";
        let shares = split_key(key, 3, 5).unwrap();

        let encoded = shares[0].encode();
        assert!(encoded.starts_with("vault:"));

        let decoded = SharePayload::decode(&encoded).unwrap();
        assert_eq!(decoded.v, shares[0].v);
        assert_eq!(decoded.i, shares[0].i);
        assert_eq!(decoded.t, shares[0].t);
        assert_eq!(decoded.n, shares[0].n);
        assert_eq!(decoded.share_bytes, shares[0].share_bytes);
    }

    #[test]
    fn test_encode_decode_all_shares() {
        let key = b"0123456789abcdef0123456789abcdef";
        let shares = split_key(key, 3, 5).unwrap();

        // Encode all, decode all, recombine
        let encoded: Vec<String> = shares.iter().map(|s| s.encode()).collect();
        let decoded: Vec<SharePayload> = encoded
            .iter()
            .map(|s| SharePayload::decode(s).unwrap())
            .collect();

        let subset = &decoded[0..3];
        let recovered = combine_shares(subset).unwrap();
        assert_eq!(recovered, key);
    }

    #[test]
    fn test_decode_with_whitespace() {
        let key = b"0123456789abcdef0123456789abcdef";
        let shares = split_key(key, 3, 5).unwrap();

        // Simulate PDF copy-paste with surrounding whitespace
        let encoded = shares[0].encode();
        let padded = format!("  {encoded}  ");
        let decoded = SharePayload::decode(&padded).unwrap();
        assert_eq!(decoded.i, shares[0].i);
    }

    #[test]
    fn test_decode_invalid_prefix() {
        let result = SharePayload::decode("notavault:abc123");
        assert!(result.is_err());
    }

    #[test]
    fn test_decode_bad_checksum() {
        let key = b"0123456789abcdef0123456789abcdef";
        let shares = split_key(key, 3, 5).unwrap();

        let mut encoded = shares[0].encode();
        // Corrupt last character
        encoded.pop();
        encoded.push('X');
        let result = SharePayload::decode(&encoded);
        assert!(result.is_err());
    }

    #[test]
    fn test_duplicate_share_detection() {
        let key = b"0123456789abcdef0123456789abcdef";
        let shares = split_key(key, 3, 5).unwrap();

        let dupes = vec![shares[0].clone(), shares[0].clone(), shares[2].clone()];
        let result = validate_share_set(&dupes);
        assert!(matches!(result, Err(CoreError::DuplicateShare(1))));
    }

    #[test]
    fn test_incompatible_shares() {
        let key = b"0123456789abcdef0123456789abcdef";
        let shares_a = split_key(key, 3, 5).unwrap();
        let shares_b = split_key(key, 2, 4).unwrap();

        let mixed = vec![shares_a[0].clone(), shares_b[0].clone()];
        let result = validate_share_set(&mixed);
        assert!(matches!(result, Err(CoreError::IncompatibleShares(_))));
    }
}
