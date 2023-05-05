use crate::{
    seeds::GSOL_MINT_AUTHORITY, state::ControllerState, token, utils::get_cpi_program_id,
    BeamProgramError,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::{
    instructions::Instructions as SysvarInstructions, SysvarId,
};
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct MintGsol<'info> {
    #[account(
        mut,
        has_one = gsol_mint,
    )]
    pub state: Box<Account<'info, ControllerState>>,
    pub beam: Signer<'info>,
    #[account(mut)]
    pub gsol_mint: Box<Account<'info, Mint>>,
    #[account(
        seeds = [state.key().as_ref(), GSOL_MINT_AUTHORITY],
        bump = state.gsol_mint_authority_bump
    )]
    pub gsol_mint_authority: SystemAccount<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub mint_gsol_to: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    /// CHECK: We check that the address is that of the instructions sysvar.
    #[account(constraint = SysvarInstructions::check_id(sysvar.key))]
    pub sysvar: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<MintGsol>, amount: u64) -> Result<()> {
    let accounts = &ctx.accounts;

    let cpi_program = get_cpi_program_id(&accounts.sysvar.to_account_info())?;
    crate::check_beam_parameters(
        &accounts.state,
        &accounts.beam.to_account_info(),
        &cpi_program,
    )?;

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
        return Err(BeamProgramError::MintWindowExceeded.into());
    }

    todo!("Add checks that minting is allowed");
    Ok(())
}
