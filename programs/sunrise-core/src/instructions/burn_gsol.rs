use crate::{system, token, utils, BeamError, BurnGsol};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<BurnGsol>, amount_in_lamports: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;

    // Check that the requesting program is valid.
    let cpi_program =
        utils::get_cpi_program_id(&ctx.accounts.sysvar_instructions.to_account_info())?;
    system::checked_find_beam_idx(state, &ctx.accounts.beam, &cpi_program)?;

    let details = state
        .get_mut_beam_details(&ctx.accounts.beam.key())
        .ok_or(BeamError::UnidentifiedBeam)?;

    // Can't burn more gsol than this beam is responsible for.
    if details.partial_gsol_supply < amount_in_lamports {
        msg!(
            "Beam supply {}, requested burn {}",
            details.partial_gsol_supply,
            amount_in_lamports
        );
        return Err(BeamError::BurnWindowExceeded.into());
    }

    details.partial_gsol_supply = details
        .partial_gsol_supply
        .checked_sub(amount_in_lamports)
        .unwrap();
    token::burn(
        amount_in_lamports,
        &ctx.accounts.gsol_mint.to_account_info(),
        &ctx.accounts.burn_gsol_from_owner.to_account_info(),
        &ctx.accounts.burn_gsol_from.to_account_info(),
        &ctx.accounts.token_program,
    )?;

    Ok(())
}
