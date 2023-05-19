use crate::{token, utils::get_cpi_program_id, BeamError, MintGsol};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<MintGsol>, amount: u64) -> Result<()> {
    let accounts = &ctx.accounts;
    let state_account = &accounts.state;

    let cpi_program = get_cpi_program_id(&accounts.sysvar.to_account_info())?;
    state_account.check_beam_validity(&accounts.beam, &cpi_program)?;

    let can_mint = { true };

    if can_mint {
        token::mint_to(
            amount,
            &accounts.gsol_mint.to_account_info(),
            &accounts.gsol_mint_authority,
            &accounts.mint_gsol_to.to_account_info(),
            &accounts.token_program,
            &accounts.state,
        )?;
    } else {
        return Err(BeamError::MintWindowExceeded.into());
    }

    todo!("Add checks that minting is allowed");
    Ok(())
}
