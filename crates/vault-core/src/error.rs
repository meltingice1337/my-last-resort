use thiserror::Error;

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("invalid share: {0}")]
    InvalidShare(String),

    #[error("insufficient shares: need {needed}, got {got}")]
    InsufficientShares { needed: u8, got: usize },

    #[error("incompatible shares: {0}")]
    IncompatibleShares(String),

    #[error("duplicate share index: {0}")]
    DuplicateShare(u8),

    #[error("recovery failed: {0}")]
    RecoveryFailed(String),
}
