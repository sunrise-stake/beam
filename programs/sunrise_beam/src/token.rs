use crate::{state::State, GSOL_AUTHORITY};
use anchor_lang::prelude::*;
use anchor_spl::token;

pub fn mint_to<'a>(
    amount: u64,
    mint: &AccountInfo<'a>,
    mint_authority: &AccountInfo<'a>,
    recipient_token_account: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    state: &Account<'a, State>,
) -> Result<()> {
    let state_address = state.key();
    let seeds = &[
        state_address.as_ref(),
        GSOL_AUTHORITY,
        &[state.gsol_mint_authority_bump],
    ];
    let pda_signer = &[&seeds[..]];

    let cpi_program = token_program.clone();
    let accounts = token::MintTo {
        mint: mint.clone(),
        to: recipient_token_account.clone(),
        authority: mint_authority.clone(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, accounts).with_signer(pda_signer);
    token::mint_to(cpi_ctx, amount)
}

pub fn burn<'a>(
    amount: u64,
    mint: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    token_account: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> Result<()> {
    let cpi_program = token_program.clone();
    let accounts = token::Burn {
        mint: mint.clone(),
        authority: authority.clone(),
        from: token_account.clone(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, accounts);
    token::burn(cpi_ctx, amount)
}
