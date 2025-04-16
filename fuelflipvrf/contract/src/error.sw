library;

pub enum Error {
    RoundIsInProgress: (),
    /// Only base asset is supported.
    InvalidAsset: (),
    /// Coins transferred should match VRF fee.
    InvalidAmount: (),
    UnknownSeed: (),
    SeedMismatch: (),
    OnlyVrfCanFulfill: (),
}