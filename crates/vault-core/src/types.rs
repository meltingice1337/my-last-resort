use zeroize::ZeroizeOnDrop;

use crate::error::CoreError;

const SHARE_PREFIX: &str = "vault:";
const HEADER_LEN: usize = 4;

#[derive(Debug, Clone, ZeroizeOnDrop)]
pub struct SharePayload {
    pub v: u8,
    pub i: u8,
    pub t: u8,
    pub n: u8,
    pub share_bytes: Vec<u8>,
}

impl SharePayload {
    /// Encode to compact string: "vault:" + base58check([v, i, t, n, share_bytes...])
    pub fn encode(&self) -> String {
        let mut payload = Vec::with_capacity(HEADER_LEN + self.share_bytes.len());
        payload.push(self.v);
        payload.push(self.i);
        payload.push(self.t);
        payload.push(self.n);
        payload.extend_from_slice(&self.share_bytes);

        let encoded = bs58::encode(&payload).with_check().into_string();
        format!("{SHARE_PREFIX}{encoded}")
    }

    /// Decode from compact string: strip "vault:", base58check decode, extract fields
    pub fn decode(input: &str) -> Result<Self, CoreError> {
        let cleaned: String = input.chars().filter(|c| !c.is_whitespace()).collect();

        let b58 = cleaned.strip_prefix(SHARE_PREFIX).ok_or_else(|| {
            CoreError::InvalidShare(format!("missing '{SHARE_PREFIX}' prefix"))
        })?;

        let payload = bs58::decode(b58)
            .with_check(None)
            .into_vec()
            .map_err(|e| CoreError::InvalidShare(format!("base58check decode failed: {e}")))?;

        if payload.len() < HEADER_LEN + 1 {
            return Err(CoreError::InvalidShare("payload too short".into()));
        }

        let share = SharePayload {
            v: payload[0],
            i: payload[1],
            t: payload[2],
            n: payload[3],
            share_bytes: payload[HEADER_LEN..].to_vec(),
        };

        share.validate()?;
        Ok(share)
    }

    pub fn validate(&self) -> Result<(), CoreError> {
        if self.v != 2 {
            return Err(CoreError::InvalidShare(format!(
                "unsupported version: {}", self.v
            )));
        }
        if self.i < 1 || self.i > self.n {
            return Err(CoreError::InvalidShare(format!(
                "index {} out of range 1..{}", self.i, self.n
            )));
        }
        if self.t < 2 || self.t > self.n {
            return Err(CoreError::InvalidShare(format!(
                "threshold {} invalid for {} total shares", self.t, self.n
            )));
        }
        if self.share_bytes.is_empty() {
            return Err(CoreError::InvalidShare("empty share data".into()));
        }
        Ok(())
    }
}

#[derive(Debug)]
pub struct ShareSetInfo {
    pub threshold: u8,
    pub total: u8,
    pub count: usize,
    pub ready: bool,
}
