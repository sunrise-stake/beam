use anchor_lang::prelude::*;
use crate::{system, token, utils, BeamError, BurnGsol};

pub fn handler(ctx: Context<BurnGsol>, amount_in_lamports: u64) -> Result<()> {
    let amount = amount_in_lamports;
    let state = &mut ctx.accounts.state;

    // Check that the requesting program is valid.
    let cpi_program = utils::get_cpi_program_id(&ctx.accounts.instructions_sysvar.to_account_info())?;
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
        &ctx.accounts.burn_gsol_from_owner.to_account_info(),
        &ctx.accounts.burn_gsol_from.to_account_info(),
        &ctx.accounts.token_program,
    )?;

    Ok(())
}
