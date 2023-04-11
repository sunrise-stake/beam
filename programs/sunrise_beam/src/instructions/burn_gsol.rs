use crate::{
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
pub struct BurnGsol<'info> {
    #[account(
        mut,
        has_one = gsol_mint,
    )]
    pub state: Box<Account<'info, State>>,

    #[account(
        mut,
        has_one = state,
        has_one = beam_authority,
        constraint = !beam_state.frozen @ FrozenBeam,
    )]
    pub beam_state: Box<Account<'info, BeamApprovalState>>,

    pub beam_authority: Signer<'info>,

    #[account(mut)]
    pub gsol_mint: Box<Account<'info, Mint>>,

    pub mint_gsol_to_owner: Signer<'info>,
    #[account(
        mut,
        token::mint = gsol_mint,
        token::authority = mint_gsol_to_owner
    )]
    pub mint_gsol_to: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,

    /// CHECK: Checked with solana_program::sysvar::SysvarId::check_id()
    #[account(constraint = SysvarInstructions::check_id(sysvar.key))]
    pub sysvar: AccountInfo<'info>,
}

pub fn burn_gsol_handler(ctx: Context<BurnGsol>, amount: u64) -> Result<()> {
    let accounts = &ctx.accounts;

    // Check the calling program.
    let relative_ix = get_instruction_relative(0, &accounts.sysvar)?;
    if relative_ix.program_id != accounts.beam_state.program_id {
        return Err(ProgramError::IncorrectProgramId.into());
    }

    let _mint_supply = accounts.gsol_mint.supply;
    let _min_allocation = accounts.beam_state.min_allocation;
    let can_burn = {
        // TODO: Check allocation to decide if the BAS state
        // supports minting this gsol amount.
        true
    };

    if !can_burn {
        return Err(ProgramError::InvalidAccountData.into());
    }

    token::burn(
        amount,
        &accounts.gsol_mint.to_account_info(),
        &accounts.mint_gsol_to_owner.to_account_info(),
        &accounts.mint_gsol_to.to_account_info(),
        &accounts.token_program,
    )?;

    // TODO: Modify allocation.

    Ok(())
}
