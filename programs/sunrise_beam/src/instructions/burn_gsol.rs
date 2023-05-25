use crate::{system, token, utils, BeamError, BurnGsol};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<BurnGsol>, amount: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;

    // Check that the requesting program is valid.
    let cpi_program = utils::get_cpi_program_id(&ctx.accounts.sysvar.to_account_info())?;
    system::check_beam_validity(state, &ctx.accounts.beam, &cpi_program)?;

    let details = state
        .get_mut_beam_details(&ctx.accounts.beam.key())
        .ok_or(BeamError::UnidentifiedBeam)?;

    if details.minted < amount {
        return Err(BeamError::BurnWindowExceeded.into());
    }

    details.minted = details.minted.checked_sub(amount).unwrap();
    token::burn(
        amount,
        &ctx.accounts.gsol_mint.to_account_info(),
        &ctx.accounts.mint_gsol_to_owner.to_account_info(),
        &ctx.accounts.mint_gsol_to.to_account_info(),
        &ctx.accounts.token_program,
    )?;

    Ok(())
}
