use crate::seeds::GSOL_MINT_AUTHORITY;
use crate::state::{State, StateInput};
use crate::token::create_mint;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;

#[derive(Accounts)]
#[instruction(input: StateInput)]
pub struct RegisterState<'info> {
    #[account(init, space = 8 + State::SPACE, payer = payer)]
    pub state: Account<'info, State>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub gsol_mint: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn register_state_handler(ctx: Context<RegisterState>, input: StateInput) -> Result<()> {
    let state_account = &mut ctx.accounts.state;
    state_account.register(&input, &ctx.accounts.gsol_mint.key());

    let gsol_mint_authority = Pubkey::create_program_address(
        &[
            &state_account.key().to_bytes(),
            GSOL_MINT_AUTHORITY,
            &[state_account.gsol_mint_authority_bump],
        ],
        ctx.program_id,
    )
    .unwrap();

    create_mint(
        &ctx.accounts.payer,
        &ctx.accounts.gsol_mint.to_account_info(),
        &gsol_mint_authority,
        &ctx.accounts.system_program,
        &ctx.accounts.token_program,
        &ctx.accounts.rent.to_account_info(),
    )?;

    Ok(())
}
