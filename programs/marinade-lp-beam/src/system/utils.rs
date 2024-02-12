use super::balance::LiquidityPoolBalance;
use crate::state::State;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use marinade_common::proportional;
use marinade_cpi::State as MarinadeState;
use sunrise_core::BeamError;

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

pub fn calc_liq_pool_tokens_from_lamports(
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
        .map_err(|_| error!(crate::MarinadeLpBeamError::CalculationFailure))
}
