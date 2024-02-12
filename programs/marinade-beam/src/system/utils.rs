use crate::state::State;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    borsh0_10::try_from_slice_unchecked, stake::state::StakeStateV2,
};
use anchor_spl::token::TokenAccount;
use marinade_common::calc_lamports_from_msol_amount;
use marinade_cpi::state::State as MarinadeState;
use sunrise_core::BeamError;

/// Calculates the amount that can be extracted as yield, in lamports.
pub fn calculate_extractable_yield(
    sunrise_state: &sunrise_core::State,
    beam_state: &Account<State>,
    marinade_state: &MarinadeState,
    msol_vault: &TokenAccount,
) -> Result<u64> {
    let staked_value = calc_lamports_from_msol_amount(marinade_state, msol_vault.amount)
        .map_err(|_| error!(crate::MarinadeBeamError::CalculationFailure))?;
    let details = sunrise_state
        .get_beam_details(&beam_state.key())
        .ok_or(BeamError::UnidentifiedBeam)?;
    let staked_sol = details.partial_gsol_supply;
    Ok(staked_value.saturating_sub(staked_sol))
}

pub fn get_delegated_stake_amount(stake_account: &AccountInfo) -> Result<u64> {
    // Gets the active stake amount of the stake account. We need this to determine how much gSol to mint.
    let stake_state = try_from_slice_unchecked::<StakeStateV2>(&stake_account.data.borrow())?;

    match stake_state.delegation() {
        Some(delegation) => Ok(delegation.stake),
        None => Err(crate::MarinadeBeamError::NotDelegated.into()),
    }
}
