use anchor_lang::prelude::*;
use anchor_spl::token::spl_token::instruction::AuthorityType;
use anchor_spl::token::{set_authority, SetAuthority};

use crate::{ExportMintAuthority, GSOL_AUTHORITY};

pub fn handler(ctx: Context<ExportMintAuthority>) -> Result<()> {
    let state = &ctx.accounts.state;
    let state_key = state.key();
    let gsol_mint_authority = &ctx.accounts.gsol_mint_authority;
    let gsol_mint = &ctx.accounts.gsol_mint;

    let seeds = &[
        state_key.as_ref(),
        GSOL_AUTHORITY,
        &[state.gsol_mint_authority_bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        SetAuthority {
            current_authority: gsol_mint_authority.to_account_info(),
            account_or_mint: gsol_mint.to_account_info(),
        },
        signer,
    );

    set_authority(
        cpi_ctx,
        AuthorityType::MintTokens,
        Some(ctx.accounts.new_authority.key()),
    )?;
    Ok(())
}
