use crate::{token, utils::get_cpi_program_id, BeamError, BurnGsol};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<BurnGsol>, amount: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;

    let cpi_program = get_cpi_program_id(&ctx.accounts.sysvar.to_account_info())?;
    state.check_beam_validity(&ctx.accounts.beam, &cpi_program)?;

    let can_burn = {
        let allocation = state.get_mut_allocation(&ctx.accounts.beam.key());
        if allocation.is_none() {
            return Err(BeamError::UnidentifiedBeam.into());
        }
        let allocation = allocation.unwrap();

        if allocation.minted > amount {
            allocation.minted = allocation.minted.checked_sub(amount).unwrap();
            true
        } else {
            false
        }
    };

    if can_burn {
        token::burn(
            amount,
            &ctx.accounts.gsol_mint.to_account_info(),
            &ctx.accounts.mint_gsol_to_owner.to_account_info(),
            &ctx.accounts.mint_gsol_to.to_account_info(),
            &ctx.accounts.token_program,
        )?;
    } else {
        return Err(BeamError::BurnWindowExceeded.into());
    }

    Ok(())
}
