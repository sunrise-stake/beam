use super::balance::LiquidityPoolBalance;
use crate::state::State;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use marinade_common::{
    calc_lamports_from_msol_amount, proportional, proportional_with_rounding, RoundingMode,
};
use marinade_cpi::State as MarinadeState;
use sunrise_core::BeamError;

// estimated 0.3% unstake fee
// const WITHDRAWAL_FRACTION : f64 =  0.997;
const WITHDRAWAL_FRACTION: f64 = 1.0;

/// Calculates the amount that can be extracted as yield, in lamports.
pub fn calculate_extractable_yield(
    sunrise_state: &sunrise_core::State,
    beam_state: &Account<State>,
    marinade_state: &MarinadeState,
    liq_pool_mint: &Mint,
    liq_pool_token_account: &TokenAccount,
    liq_pool_sol_leg_pda: &AccountInfo,
    liq_pool_msol_leg: &TokenAccount,
) -> Result<LiquidityPoolBalance> {
    // the liquidity pool balance owned by the beam (LP tokens, SOL and mSOL)
    let staked_balance = current_liq_pool_balance(
        marinade_state,
        liq_pool_mint,
        liq_pool_token_account,
        liq_pool_sol_leg_pda,
        liq_pool_msol_leg,
    )?;

    // the amount of SOL that this beam is responsible for.
    // The value of the liquidity pool is at least this high. However, the lp value is split across
    // SOL and mSOL
    let details = sunrise_state
        .get_beam_details(&beam_state.key())
        .ok_or(BeamError::UnidentifiedBeam)?;
    let staked_sol = details.partial_gsol_supply;

    // the lp balance that is required to cover the staked SOL. This is a combination of SOL and mSOL.
    let required_lp_tokens_to_cover_staked_sol = calculate_liq_pool_token_value_of_lamports(
        marinade_state,
        liq_pool_mint,
        liq_pool_sol_leg_pda,
        liq_pool_msol_leg,
        staked_sol,
    );

    msg!("staked_balance: {:?}", staked_balance);

    let required_liq_pool_balance = liq_pool_balance_for_tokens(
        required_lp_tokens_to_cover_staked_sol,
        marinade_state,
        liq_pool_mint,
        liq_pool_sol_leg_pda,
        liq_pool_msol_leg,
    )?;
    msg!("required_liq_pool_balance: {:?}", required_liq_pool_balance);

    // return the difference between the staked balance and the required balance
    let diff = staked_balance.sub(required_liq_pool_balance);

    msg!("diff: {:?}", diff);
    Ok(diff)
}

// in the marinade-lp beam, extractable yield is equivalent to surplus LP tokens
// when LP tokens are redeemed, the result is SOL and mSOL (both sides of the pool)
// the SOL is sent to the yield account,
// and the mSOL is sent to the beam's mSOL token account, which is typically
// the Marinade-SP's beam vault.
// This results in less extractable yield for this beam, and more for the Marinade-SP beam.
// (However, in reality, this beam should rarely be extracted from, as it is
// included as a buffer to allow for fee-less gSOL withdrawals)
// Subtract fee TODO can we do better than an estimate?
pub fn get_extractable_yield_from_excess_balance(excess_balance: u64) -> u64 {
    let extractable_lamports = (excess_balance as f64) * WITHDRAWAL_FRACTION;
    msg!("Excess balance: {:?}", excess_balance);
    msg!("Extractable yield: {}", extractable_lamports);
    extractable_lamports as u64
}

// Prevent the compiler from enlarging the stack and potentially triggering an Access violation
#[inline(never)]
/// Returns the current liquidity pool balance owned by the beam
pub fn current_liq_pool_balance(
    marinade_state: &MarinadeState,
    liq_pool_mint: &Mint,
    liq_pool_token_account: &TokenAccount,
    liq_pool_sol_leg_pda: &AccountInfo,
    liq_pool_msol_leg: &TokenAccount,
) -> Result<LiquidityPoolBalance> {
    liq_pool_balance_for_tokens(
        liq_pool_token_account.amount,
        marinade_state,
        liq_pool_mint,
        liq_pool_sol_leg_pda,
        liq_pool_msol_leg,
    )
}

// Prevent the compiler from enlarging the stack and potentially triggering an Access violation
#[inline(never)]
/// Returns the liquidity pool balance for a given amount of lp tokens
pub(super) fn liq_pool_balance_for_tokens(
    tokens: u64,
    marinade_state: &MarinadeState,
    liq_pool_mint: &Mint,
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
    let sunrise_liq_pool_balance = total_balance.value_of(tokens)?;

    msg!("Total LP: {:?}", total_balance);
    msg!("LP for token: {:?}", sunrise_liq_pool_balance);
    msg!(
        "Total LP value: {:?}",
        total_balance.sol_value(marinade_state)
    );
    msg!(
        "LP value: {:?}",
        sunrise_liq_pool_balance.sol_value(marinade_state)
    );

    Ok(sunrise_liq_pool_balance)
}

pub fn calculate_liq_pool_token_value_of_lamports(
    marinade_state: &MarinadeState,
    liq_pool_mint: &Mint,
    liq_pool_sol_leg_pda: &AccountInfo,
    liq_pool_msol_leg: &TokenAccount,
    lamports: u64,
) -> u64 {
    let total_lamports = liq_pool_sol_leg_pda
        .lamports()
        .checked_sub(marinade_state.rent_exempt_for_token_acc)
        .unwrap();
    let total_msol = liq_pool_msol_leg.amount;
    let lamports_value_of_msol = calc_lamports_from_msol_amount(marinade_state, total_msol);
    let total_value_of_pool = total_lamports.checked_add(lamports_value_of_msol).unwrap();

    proportional(liq_pool_mint.supply, lamports, total_value_of_pool)
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
        sol_leg_lamports as i128,
        liq_pool_msol_leg.amount as i128,
        liq_pool_mint.supply as i128,
    )
}

pub fn calculate_liq_pool_balance_required_to_withdraw_lamports(
    marinade_state: &MarinadeState,
    liq_pool_mint: &Mint,
    liq_pool_sol_leg_pda: &AccountInfo,
    liq_pool_msol_leg: &TokenAccount,
    lamports: u64,
) -> Result<LiquidityPoolBalance> {
    let liq_pool_lamports = liq_pool_sol_leg_pda
        .lamports()
        .checked_sub(marinade_state.rent_exempt_for_token_acc)
        .unwrap();
    let liq_pool_mint_supply = liq_pool_mint.supply;

    // Round up to ensure that the amount of LP tokens is enough to withdraw the required amount of SOL
    let liq_pool_tokens = proportional_with_rounding(
        liq_pool_mint_supply,
        lamports,
        liq_pool_lamports,
        RoundingMode::Up,
    );

    liq_pool_balance_for_tokens(
        liq_pool_tokens,
        marinade_state,
        liq_pool_mint,
        liq_pool_sol_leg_pda,
        liq_pool_msol_leg,
    )
}
