use crate::seeds::GSOL_MINT_AUTHORITY;
use crate::state::{ControllerState, RegisterStateInput};
use crate::token::create_mint;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;

#[derive(Accounts)]
#[instruction(input: RegisterStateInput)]
pub struct RegisterState<'info> {
    #[account(
        init,
        space = ControllerState::size(input.initial_capacity),
        payer = payer
    )]
    pub state: Account<'info, ControllerState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub gsol_mint: Signer<'info>,
    #[account(seeds = [state.key().as_ref(), GSOL_MINT_AUTHORITY], bump)]
    pub gsol_mint_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<RegisterState>, input: RegisterStateInput) -> Result<()> {
    let state_account = &mut ctx.accounts.state;

    let auth_bump = *ctx.bumps.get("gsol_mint_authority").unwrap();

    state_account.register(input, auth_bump, &ctx.accounts.gsol_mint.key());

    create_mint(
        &ctx.accounts.payer,
        &ctx.accounts.gsol_mint.to_account_info(),
        &ctx.accounts.gsol_mint_authority.key(),
        &ctx.accounts.system_program,
        &ctx.accounts.token_program,
        &ctx.accounts.rent.to_account_info(),
    )?;

    Ok(())
}
