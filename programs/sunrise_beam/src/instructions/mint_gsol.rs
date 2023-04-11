use crate::{
    seeds::GSOL_MINT_AUTHORITY,
    state::{BeamApprovalState, State},
    token,
    SunriseError::*,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::{
    instructions::{get_instruction_relative, Instructions as SysvarInstructions},
    SysvarId,
};
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct MintGsol<'info> {
    #[account(
        mut,
        has_one = gsol_mint,
    )]
    pub state: Box<Account<'info, State>>,

    #[account(
        mut,
        has_one = beam_authority,
        has_one = state,
        constraint = !beam_state.frozen @ FrozenBeam,
    )]
    pub beam_state: Box<Account<'info, BeamApprovalState>>,
    pub beam_authority: Signer<'info>,

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

    /// CHECK: Checked with solana_program::sysvar::SysvarId::check_id()
    #[account(constraint = SysvarInstructions::check_id(sysvar.key))]
    pub sysvar: UncheckedAccount<'info>,
}

pub fn mint_gsol_handler(ctx: Context<MintGsol>, amount: u64) -> Result<()> {
    let accounts = &ctx.accounts;

    // Check the calling program
    let relative_ix = get_instruction_relative(0, &accounts.sysvar)?;
    if relative_ix.program_id != accounts.beam_state.program_id {
        return Err(ProgramError::IncorrectProgramId.into());
    }

    let _mint_supply = accounts.gsol_mint.supply;
    let _max_allocation = accounts.beam_state.max_allocation;
    let can_mint = {
        // TODO: Check allocation to decide if the BAS state
        // supports minting this gsol amount.
        true
    };

    if !can_mint {
        return Err(ProgramError::InvalidAccountData.into());
    }

    token::mint_to(
        amount,
        &accounts.gsol_mint.to_account_info(),
        &accounts.gsol_mint_authority,
        &accounts.mint_gsol_to.to_account_info(),
        &accounts.token_program,
        &accounts.state,
    )?;

    // TODO: Modify allocation.

    Ok(())
}
