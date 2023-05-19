use crate::{state::RegisterStateInput, RegisterState};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<RegisterState>, input: RegisterStateInput) -> Result<()> {
    let state_account = &mut ctx.accounts.state;

    let auth_bump = *ctx.bumps.get("gsol_mint_authority").unwrap();
    let mint_key = ctx.accounts.gsol_mint.key();
    let mint_supply = ctx.accounts.gsol_mint.supply;

    state_account.register(input, auth_bump, &mint_key, mint_supply);
    Ok(())
}
