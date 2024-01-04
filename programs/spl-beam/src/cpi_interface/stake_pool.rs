use crate::cpi_interface::program::SPL_STAKE_POOL_PROGRAM_ID;
use anchor_lang::prelude::borsh::BorshDeserialize;
use anchor_lang::prelude::Pubkey;
use anchor_lang::{AccountDeserialize, AccountSerialize};
use std::ops::Deref;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct StakePool(spl_stake_pool::state::StakePool);

impl AccountDeserialize for StakePool {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        spl_stake_pool::state::StakePool::deserialize(buf)
            .map(StakePool)
            .map_err(Into::into)
    }
}

impl AccountSerialize for StakePool {}

impl anchor_lang::Owner for StakePool {
    fn owner() -> Pubkey {
        SPL_STAKE_POOL_PROGRAM_ID
    }
}

impl Deref for StakePool {
    type Target = spl_stake_pool::state::StakePool;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
