use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    borsh0_10::try_from_slice_unchecked, stake::state::StakeStateV2,
};
use spl_stake_pool::state::StakePool;

/// calculate amount*numerator/denominator
/// as value  = shares * share_price where share_price=total_value/total_shares
/// or shares = amount_value / share_price where share_price=total_value/total_shares
///     => shares = amount_value * 1/share_price where 1/share_price=total_shares/total_value
pub fn proportional(amount: u64, numerator: u64, denominator: u64) -> Result<u64> {
    if denominator == 0 {
        return Ok(amount);
    }
    u64::try_from((amount as u128) * (numerator as u128) / (denominator as u128))
        .map_err(|_| error!(crate::SplBeamError::CalculationFailure))
}

pub fn pool_tokens_from_lamports(stake_pool: &AccountInfo, lamports: u64) -> Result<u64> {
    let stake_pool = try_from_slice_unchecked::<StakePool>(&stake_pool.data.borrow())?;
    let token_supply = stake_pool.pool_token_supply;
    let total_lamports = stake_pool.total_lamports;

    proportional(lamports, token_supply, total_lamports)
}

pub fn get_delegated_stake_amount(stake_account: &AccountInfo) -> Result<u64> {
    // Gets the active stake amount of the stake account. We need this to determine how much gSol to mint.
    let stake_state = try_from_slice_unchecked::<StakeStateV2>(&stake_account.data.borrow())?;

    match stake_state.delegation() {
        Some(delegation) => Ok(delegation.stake),
        None => Err(crate::SplBeamError::NotDelegated.into()),
    }
}
