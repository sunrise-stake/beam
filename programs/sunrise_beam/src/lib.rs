#![allow(clippy::result_large_err)]
#![allow(unreachable_code)]

mod instructions;
mod seeds;
mod state;
mod token;
mod utils;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::{
    instructions::Instructions as SysvarInstructions, SysvarId,
};
use anchor_spl::token::{Mint, Token, TokenAccount};
use instructions::*;
use seeds::GSOL_MINT_AUTHORITY;
use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sunrise_beam {
    use super::*;

    pub fn register_state(ctx: Context<RegisterState>, input: RegisterStateInput) -> Result<()> {
        register_state::handler(ctx, input)
    }

    pub fn update_state(ctx: Context<UpdateState>, input: UpdateStateInput) -> Result<()> {
        update_state::handler(ctx, input)
    }

    pub fn register_beam(ctx: Context<RegisterBeam>, input: RegisterBeamInput) -> Result<()> {
        register_beam::handler(ctx, input)
    }

    pub fn mint_gsol(ctx: Context<MintGsol>, amount: u64) -> Result<()> {
        mint_gsol::handler(ctx, amount)
    }

    pub fn burn_gsol(ctx: Context<BurnGsol>, amount: u64) -> Result<()> {
        burn_gsol::handler(ctx, amount)
    }

    pub fn remove_beam(ctx: Context<RemoveBeam>, beam: Pubkey) -> Result<()> {
        remove_beam::handler(ctx, beam)
    }
}

#[derive(Accounts)]
#[instruction(input: RegisterStateInput)]
pub struct RegisterState<'info> {
    #[account(
        init,
        payer = payer,
        space = ControllerState::size(input.initial_capacity),
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

#[derive(Accounts)]
#[instruction(input: RegisterBeamInput)]
pub struct RegisterBeam<'info> {
    #[account(mut, has_one = update_authority)]
    pub state: Account<'info, ControllerState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub update_authority: Signer<'info>,
    /// CHECK: The beam being registered .
    #[account(constraint = beam_state.key() == input.beam)]
    pub beam_state: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveBeam<'info> {
    #[account(mut, has_one = update_authority)]
    pub state: Account<'info, ControllerState>,
    pub update_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BurnGsol<'info> {
    #[account(
        mut,
        has_one = gsol_mint,
    )]
    pub state: Box<Account<'info, ControllerState>>,
    pub beam: Signer<'info>,
    #[account(mut)]
    pub gsol_mint: Box<Account<'info, Mint>>,
    pub mint_gsol_to_owner: Signer<'info>,
    #[account(
        mut,
        token::mint = gsol_mint,
        token::authority = mint_gsol_to_owner
    )]
    pub mint_gsol_to: Box<Account<'info, TokenAccount>>,
    /// CHECK: We check that it's the expected ID.
    #[account(constraint = SysvarInstructions::check_id(sysvar.key))]
    pub sysvar: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

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
    /// CHECK: We check that it's the expected ID.
    #[account(constraint = SysvarInstructions::check_id(sysvar.key))]
    pub sysvar: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateState<'info> {
    #[account(mut, has_one = update_authority)]
    pub state: Account<'info, ControllerState>,
    pub update_authority: Signer<'info>,
}

#[error_code]
pub enum BeamProgramError {
    /// Thrown if an instruction parameter could cause invalid behaviour.
    #[msg("Invariant violated by parameter input")]
    InvalidParameter,

    /// Thrown if a beam's allocation doesn't support minting the set amount.
    #[msg("This beam does not support minting this amount")]
    MintWindowExceeded,

    /// Thrown if a beam's allocation doesn't support burning the set amount.
    #[msg("This beam does not support burning this amount")]
    BurnWindowExceeded,

    /// Thrown if a state has hit the maximum number of beams it can support.
    #[msg("Can't exceed the beam capacity of this state")]
    WouldExceedBeamCapacity,

    /// Thrown if we try to add a beam that's already present in the allocations vec.
    #[msg("Tried to register an already-registered beam")]
    DuplicateBeamEntry,

    /// Thrown if an action requires a beam be present, but it isn't.
    #[msg("Expected beam to be present in allocations but it isn't")]
    BeamNotPresent,

    /// Thrown the program directly making the CPI isn't the beam program.
    #[msg("Cpi isn't directly being made by beam program.")]
    UnexpectedCallingProgram,
}
