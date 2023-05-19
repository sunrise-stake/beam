use crate::{token, utils::get_cpi_program_id, BeamError, BurnGsol};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<BurnGsol>, amount: u64) -> Result<()> {
    let accounts = &ctx.accounts;
    let state_account = &accounts.state;

    let cpi_program = get_cpi_program_id(&accounts.sysvar.to_account_info())?;
    state_account.check_beam_validity(&accounts.beam, &cpi_program)?;

    let can_burn = { true };

    if can_burn {
        token::burn(
            amount,
            &accounts.gsol_mint.to_account_info(),
            &accounts.mint_gsol_to_owner.to_account_info(),
            &accounts.mint_gsol_to.to_account_info(),
            &accounts.token_program,
        )?;
    } else {
        return Err(BeamError::MintWindowExceeded.into());
    }

    todo!("Add checks that burning is allowed");
    Ok(())
}
