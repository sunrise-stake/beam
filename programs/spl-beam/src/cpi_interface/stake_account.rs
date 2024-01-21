use anchor_lang::prelude::Pubkey;
use anchor_lang::solana_program::stake::program::ID;
use borsh::BorshDeserialize;
use spl_stake_pool::solana_program::stake::state::StakeStateV2;
use std::ops::Deref;

/// A redefined StakeAccount that wraps spl StakeStateV2
/// This is needed until anchor-spl updates to solana-program 1.17
#[derive(Clone)]
pub struct StakeAccount(StakeStateV2);

impl anchor_lang::AccountDeserialize for StakeAccount {
    fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        Self::try_deserialize_unchecked(buf)
    }

    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        StakeStateV2::deserialize(buf).map(Self).map_err(Into::into)
    }
}

impl anchor_lang::AccountSerialize for StakeAccount {}

impl anchor_lang::Owner for StakeAccount {
    fn owner() -> Pubkey {
        ID
    }
}

impl Deref for StakeAccount {
    type Target = StakeStateV2;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
