use crate::state::State;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    borsh0_10::try_from_slice_unchecked, stake::state::StakeStateV2,
};
use anchor_spl::token::TokenAccount;
use marinade_cpi::state::State as MarinadeState;
use sunrise_core::BeamError;

/// Calculates the amount that can be extracted as yield, in lamports.
pub fn calculate_extractable_yield(
    sunrise_state: &sunrise_core::State,
    beam_state: &Account<State>,
    marinade_state: &MarinadeState,
    msol_vault: &TokenAccount,
) -> Result<u64> {
    let staked_value = calc_lamports_from_msol_amount(marinade_state, msol_vault.amount)?;
    let details = sunrise_state
        .get_beam_details(&beam_state.key())
        .ok_or(BeamError::UnidentifiedBeam)?;
    let staked_sol = details.partial_gsol_supply;
    Ok(staked_value.saturating_sub(staked_sol))
}

/// calculate amount*numerator/denominator
/// as value  = shares * share_price where share_price=total_value/total_shares
/// or shares = amount_value / share_price where share_price=total_value/total_shares
///     => shares = amount_value * 1/share_price where 1/share_price=total_shares/total_value
pub fn proportional(amount: u64, numerator: u64, denominator: u64) -> Result<u64> {
    if denominator == 0 {
        return Ok(amount);
    }
    u64::try_from((amount as u128) * (numerator as u128) / (denominator as u128))
        .map_err(|_| error!(crate::MarinadeBeamError::CalculationFailure))
}

// All lifted from https://github.com/marinade-finance/liquid-staking-program/blob/447f9607a8c755cac7ad63223febf047142c6c8f/programs/marinade-finance/src/state.rs#L227
pub fn calc_msol_from_lamports(marinade_state: &MarinadeState, stake_lamports: u64) -> Result<u64> {
    msg!("calc_msol_from_lamports");
    msg!("stake_lamports: {}", stake_lamports);
    msg!("marinade_state.msol_supply: {}", marinade_state.msol_supply);
    msg!(
        "total_virtual_staked_lamports: {}",
        total_virtual_staked_lamports(marinade_state)
    );
    proportional(
        stake_lamports,
        marinade_state.msol_supply,
        total_virtual_staked_lamports(marinade_state),
    )
}

pub fn calc_lamports_from_msol_amount(
    marinade_state: &MarinadeState,
    msol_amount: u64,
) -> Result<u64> {
    proportional(
        msol_amount,
        total_virtual_staked_lamports(marinade_state),
        marinade_state.msol_supply,
    )
}

pub fn get_delegated_stake_amount(stake_account: &AccountInfo) -> Result<u64> {
    // Gets the active stake amount of the stake account. We need this to determine how much gSol to mint.
    let stake_state = try_from_slice_unchecked::<StakeStateV2>(&stake_account.data.borrow())?;

    match stake_state.delegation() {
        Some(delegation) => Ok(delegation.stake),
        None => Err(crate::MarinadeBeamError::NotDelegated.into()),
    }
}

fn total_cooling_down(marinade_state: &MarinadeState) -> u64 {
    marinade_state
        .stake_system
        .delayed_unstake_cooling_down
        .checked_add(marinade_state.emergency_cooling_down)
        .expect("Total cooling down overflow")
}

fn total_lamports_under_control(marinade_state: &MarinadeState) -> u64 {
    marinade_state
        .validator_system
        .total_active_balance
        .checked_add(total_cooling_down(marinade_state))
        .expect("Stake balance overflow")
        .checked_add(marinade_state.available_reserve_balance) // reserve_pda.lamports() - self.rent_exempt_for_token_acc
        .expect("Total SOLs under control overflow")
}

fn total_virtual_staked_lamports(marinade_state: &MarinadeState) -> u64 {
    // if we get slashed it may be negative but we must use 0 instead
    total_lamports_under_control(marinade_state)
        .saturating_sub(marinade_state.circulating_ticket_balance) //tickets created -> cooling down lamports or lamports already in reserve and not claimed yet
}
