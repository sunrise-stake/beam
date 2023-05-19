use crate::{state::RegisterStateInput, token::create_mint, RegisterState};
use anchor_lang::prelude::*;

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
