use crate::cpi_interface::stake_pool::StakePool;
use crate::state::State;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    borsh0_10::try_from_slice_unchecked, stake::state::StakeStateV2,
};
use anchor_spl::token::TokenAccount;
use sunrise_core::BeamError;

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

pub fn pool_tokens_from_lamports(stake_pool: &StakePool, lamports: u64) -> Result<u64> {
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

/// Calculates the amount of yield that can be extracted from this pool.
/// This is calculated as:
/// The value of the pool tokens minus the amount of SOL staked in the beam
pub fn calculate_extractable_yield(
    sunrise_state: &Account<sunrise_core::State>,
    beam_state: &Account<State>,
    stake_pool: &Account<StakePool>,
    pool_token_vault: &Account<TokenAccount>,
) -> Result<u64> {
    // Calculate the beam's ownership of the stake pool state
    let total_lamports = stake_pool.total_lamports;
    let token_supply = stake_pool.pool_token_supply;
    let balance = pool_token_vault.amount;
    let owned_pool_value = proportional(balance, token_supply, total_lamports)?;

    // Calculate the amount of SOL staked in the beam
    let details = sunrise_state
        .get_beam_details(&beam_state.key())
        .ok_or(BeamError::UnidentifiedBeam)?;
    let staked_sol = details.partial_gsol_supply;

    Ok(owned_pool_value.saturating_sub(staked_sol))
}
