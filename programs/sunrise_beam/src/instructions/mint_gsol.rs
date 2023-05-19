use anchor_lang::prelude::*;

use crate::system::check_beam_validity;
use crate::utils::get_cpi_program_id;
use crate::{token, BeamError, MintGsol};

pub fn handler(ctx: Context<MintGsol>, amount: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;
    let gsol_mint = &ctx.accounts.gsol_mint;

    let cpi_program = get_cpi_program_id(&ctx.accounts.sysvar.to_account_info())?;
    check_beam_validity(state, &ctx.accounts.beam, &cpi_program)?;

    let can_mint = {
        let pre_supply = state.pre_supply;
        let details = state.get_mut_beam_details(&ctx.accounts.beam.key());
        if details.is_none() {
            return Err(BeamError::UnidentifiedBeam.into());
        }

        let allocation = details.unwrap();
        let effective_supply = gsol_mint.supply.checked_sub(pre_supply).unwrap();

        let mint_window = (allocation.allocation as u64)
            .checked_mul(effective_supply)
            .unwrap()
            .checked_div(100)
            .unwrap();

        if allocation.minted < mint_window {
            allocation.minted = allocation.minted.checked_add(amount).unwrap();
            true
        } else {
            false
        }
    };

    if can_mint {
        token::mint_to(
            amount,
            &ctx.accounts.gsol_mint.to_account_info(),
            &ctx.accounts.gsol_mint_authority,
            &ctx.accounts.mint_gsol_to.to_account_info(),
            &ctx.accounts.token_program,
            &ctx.accounts.state,
        )?;
    } else {
        return Err(BeamError::MintWindowExceeded.into());
    }

    Ok(())
}
