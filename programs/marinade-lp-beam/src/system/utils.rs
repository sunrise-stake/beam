use super::balance::LiquidityPoolBalance;
use crate::state::State;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use marinade_cpi::State as MarinadeState;
use sunrise_core::BeamError;

/// calculate amount*numerator/denominator
/// as value  = shares * share_price where share_price=total_value/total_shares
/// or shares = amount_value / share_price where share_price=total_value/total_shares
///     => shares = amount_value * 1/share_price where 1/share_price=total_shares/total_value
pub(super) fn proportional(amount: u64, numerator: u64, denominator: u64) -> Result<u64> {
    if denominator == 0 {
        return Ok(amount);
    }
    u64::try_from((amount as u128) * (numerator as u128) / (denominator as u128))
        .map_err(|_| error!(crate::MarinadeLpBeamError::CalculationFailure))
}

/// Calculates the amount that can be extracted as yield, in lamports.
pub fn calculate_extractable_yield(
    sunrise_state: &sunrise_core::State,
    beam_state: &Account<State>,
    marinade_state: &MarinadeState,
    liq_pool_mint: &Mint,
    liq_pool_token_account: &TokenAccount,
    liq_pool_sol_leg_pda: &AccountInfo,
    liq_pool_msol_leg: &TokenAccount,
) -> Result<u64> {
    let staked_value = current_liq_pool_balance(
        marinade_state,
        liq_pool_mint,
        liq_pool_token_account,
        liq_pool_sol_leg_pda,
        liq_pool_msol_leg,
    )?
    .sol_value(marinade_state);
    let details = sunrise_state
        .get_beam_details(&beam_state.key())
        .ok_or(BeamError::UnidentifiedBeam)?;
    let staked_sol = details.partial_gsol_supply;
    Ok(staked_value.saturating_sub(staked_sol))
}

// Prevent the compiler from enlarging the stack and potentially triggering an Access violation
#[inline(never)]
pub(super) fn current_liq_pool_balance(
    marinade_state: &MarinadeState,
    liq_pool_mint: &Mint,
    liq_pool_token_account: &TokenAccount,
    liq_pool_sol_leg_pda: &AccountInfo,
    liq_pool_msol_leg: &TokenAccount,
) -> Result<LiquidityPoolBalance> {
    //compute current liq-pool total value
    let total_balance = total_liq_pool(
        marinade_state,
        liq_pool_mint,
        liq_pool_sol_leg_pda,
        liq_pool_msol_leg,
    );

    // The SOL amount held by sunrise in the liquidity pool is the total value of the pool in SOL
    // multiplied by the proportion of the pool owned by this SunshineStake instance
    let sunrise_liq_pool_balance = total_balance.value_of(liq_pool_token_account.amount)?;

    msg!("Total LP: {:?}", total_balance);
    msg!("Sunrise LP: {:?}", sunrise_liq_pool_balance);
    msg!(
        "Total LP value: {:?}",
        total_balance.sol_value(marinade_state)
    );
    msg!(
        "Sunrise LP value: {:?}",
        sunrise_liq_pool_balance.sol_value(marinade_state)
    );

    Ok(sunrise_liq_pool_balance)
}

fn total_liq_pool(
    marinade_state: &MarinadeState,
    liq_pool_mint: &Mint,
    liq_pool_sol_leg_pda: &AccountInfo,
    liq_pool_msol_leg: &TokenAccount,
) -> LiquidityPoolBalance {
    let sol_leg_lamports = liq_pool_sol_leg_pda
        .lamports()
        .checked_sub(marinade_state.rent_exempt_for_token_acc)
        .expect("sol_leg_lamports");

    LiquidityPoolBalance::new(
        sol_leg_lamports,
        liq_pool_msol_leg.amount,
        liq_pool_mint.supply,
    )
}

pub fn liq_pool_tokens_from_lamports(
    marinade_state: &MarinadeState,
    liq_pool_mint: &Mint,
    liq_pool_sol_leg_pda: &AccountInfo,
    lamports: u64,
) -> Result<u64> {
    let liq_pool_lamports = liq_pool_sol_leg_pda
        .lamports()
        .checked_sub(marinade_state.rent_exempt_for_token_acc)
        .unwrap();
    let liq_pool_mint_supply = liq_pool_mint.supply;

    proportional(liq_pool_mint_supply, lamports, liq_pool_lamports)
}

// The following are lifted from https://github.com/marinade-finance/liquid-staking-program/blob/447f9607a8c755cac7ad63223febf047142c6c8f/programs/marinade-finance/src/state.rs#L227
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
fn total_cooling_down(marinade_state: &MarinadeState) -> u64 {
    marinade_state
        .stake_system
        .delayed_unstake_cooling_down
        .checked_add(marinade_state.emergency_cooling_down)
        .expect("Total cooling down overflow")
}
