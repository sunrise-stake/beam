use crate::{token, utils::get_cpi_program_id, BeamError, MintGsol};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<MintGsol>, amount: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;
    let gsol_mint = &ctx.accounts.gsol_mint;

    let cpi_program = get_cpi_program_id(&ctx.accounts.sysvar.to_account_info())?;
    state.check_beam_validity(&ctx.accounts.beam, &cpi_program)?;

    let can_mint = {
        let pre_supply = state.pre_supply;
        let allocation = state.get_mut_allocation(&ctx.accounts.beam.key());
        if allocation.is_none() {
            return Err(BeamError::UnidentifiedBeam.into());
        }

        let allocation = allocation.unwrap();
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
