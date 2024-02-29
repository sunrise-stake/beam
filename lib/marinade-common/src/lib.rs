pub mod vault_authority_seed;

use marinade_cpi::state::State as MarinadeState;
use num_traits::{NumCast, PrimInt};
use std::fmt::Debug;
use std::ops::{Div, Mul};

/// calculate amount*numerator/denominator
/// as value  = shares * share_price where share_price=total_value/total_shares
/// or shares = amount_value / share_price where share_price=total_value/total_shares
///     => shares = amount_value * 1/share_price where 1/share_price=total_shares/total_value
pub fn proportional<T>(amount: T, numerator: T, denominator: T) -> T
where
    T: PrimInt + Mul<Output = T> + Div<Output = T> + TryInto<i128>,
    <T as TryInto<i128>>::Error: Debug,
{
    proportional_with_rounding(amount, numerator, denominator, RoundingMode::Down)
}

pub enum RoundingMode {
    Up,
    Down,
}

pub fn proportional_with_rounding<T>(
    amount: T,
    numerator: T,
    denominator: T,
    rounding_mode: RoundingMode,
) -> T
where
    T: PrimInt + Mul<Output = T> + Div<Output = T> + TryInto<i128>,
    <T as TryInto<i128>>::Error: Debug,
{
    if denominator == T::zero() {
        return amount;
    }

    let amount_i128: i128 = amount.try_into().unwrap();
    let numerator_i128: i128 = numerator.try_into().unwrap();
    let denominator_i128: i128 = denominator.try_into().unwrap();

    match rounding_mode {
        RoundingMode::Up => {
            // Round up by adding (denominator - 1) before dividing
            let result = (amount_i128 * numerator_i128 + (denominator_i128 - 1)) / denominator_i128;
            <T as NumCast>::from(result).unwrap()
        }
        RoundingMode::Down => {
            // Default behavior (round down)
            let result = amount_i128 * numerator_i128 / denominator_i128;
            <T as NumCast>::from(result).unwrap()
        }
    }
}

// All lifted from https://github.com/marinade-finance/liquid-staking-program/blob/447f9607a8c755cac7ad63223febf047142c6c8f/programs/marinade-finance/src/state.rs#L227
pub fn calc_msol_from_lamports(marinade_state: &MarinadeState, stake_lamports: u64) -> u64 {
    proportional(
        stake_lamports,
        marinade_state.msol_supply,
        total_virtual_staked_lamports(marinade_state),
    )
}
pub fn calc_lamports_from_msol_amount(marinade_state: &MarinadeState, msol_amount: u64) -> u64 {
    proportional(
        msol_amount,
        total_virtual_staked_lamports(marinade_state),
        marinade_state.msol_supply,
    )
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
