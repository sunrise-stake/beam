use crate::{state::RegisterStateInput, RegisterState};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<RegisterState>, input: RegisterStateInput) -> Result<()> {
    let state_account = &mut ctx.accounts.state;

    let auth_bump = ctx.bumps.gsol_mint_authority;
    let mint_key = ctx.accounts.gsol_mint.key();
    let mint_supply = ctx.accounts.gsol_mint.supply;

    state_account.register(input, auth_bump, &mint_key, mint_supply)?;
    Ok(())
}
