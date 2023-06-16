use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use marinade_cpi::State as MarinadeState;

/// calculate amount*numerator/denominator
/// as value  = shares * share_price where share_price=total_value/total_shares
/// or shares = amount_value / share_price where share_price=total_value/total_shares
///     => shares = amount_value * 1/share_price where 1/share_price=total_shares/total_value
fn proportional(amount: u64, numerator: u64, denominator: u64) -> Result<u64> {
    if denominator == 0 {
        return Ok(amount);
    }
    u64::try_from((amount as u128) * (numerator as u128) / (denominator as u128))
        .map_err(|_| error!(crate::MarinadeLpBeamError::CalculationFailure))
}

pub fn liq_pool_tokens_from_lamports(
    marinade_state: &MarinadeState,
    liq_pool_mint: &Account<Mint>,
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
