use anchor_lang::prelude::*;

use crate::system::check_beam_validity;
use crate::utils::get_cpi_program_id;
use crate::{token, BeamError, BurnGsol};

pub fn handler(ctx: Context<BurnGsol>, amount: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;

    let cpi_program = get_cpi_program_id(&ctx.accounts.sysvar.to_account_info())?;
    check_beam_validity(state, &ctx.accounts.beam, &cpi_program)?;

    let can_burn = {
        let details = state.get_mut_beam_details(&ctx.accounts.beam.key());
        if details.is_none() {
            return Err(BeamError::UnidentifiedBeam.into());
        }
        let details = details.unwrap();

        if details.minted > amount {
            details.minted = details.minted.checked_sub(amount).unwrap();
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
