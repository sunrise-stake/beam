#![allow(clippy::result_large_err)]

mod instructions;
pub mod seeds;
mod state;
mod system;
mod token;
mod utils;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar;
use anchor_spl::token::{Mint, Token, TokenAccount};
use instructions::*;
use seeds::*;

pub use state::{
    AllocationUpdate, BeamDetails, EpochReport, RegisterStateInput, State, UpdateStateInput,
};

declare_id!("suncPB4RR39bMwnRhCym6ZLKqMfnFG83vjzVVuXNhCq");

#[program]
pub mod sunrise_core {
    use super::*;

    /// Initializes a [State], setting its initial parameters.
    pub fn register_state(ctx: Context<RegisterState>, input: RegisterStateInput) -> Result<()> {
        register_state::handler(ctx, input)
    }

    /// Updates a [State] without modifying its [BeamDetails] list.
    pub fn update_state(ctx: Context<UpdateState>, input: UpdateStateInput) -> Result<()> {
        update_state::handler(ctx, input)
    }

    /// Registers a beam by appending a newly-created [BeamDetails] with an
    /// allocation of 0 to the [State]. Currently, this triggers a resize if needed.
    ///
    /// The `beam` is an account that will be expected to sign CPI requests to this program.
    ///
    /// Errors if a resize is needed but the `alloc_window` is zero.
    pub fn register_beam(ctx: Context<RegisterBeam>) -> Result<()> {
        register_beam::handler(ctx)
    }

    /// Resize the state so it can append `additional` more allocations.
    pub fn resize_allocations(ctx: Context<ResizeAllocations>, additional_beams: u8) -> Result<()> {
        resize_allocations::handler(ctx, additional_beams as usize)
    }

    /// Updates allocations for beams.
    ///
    /// Errors if the sum of allocations after the update doesn't equal 100, or if
    /// one of the keys in `new_allocations` refers to an unrecognized beam.
    pub fn update_allocations(
        ctx: Context<UpdateBeamAllocations>,
        new_allocations: Vec<AllocationUpdate>,
    ) -> Result<()> {
        update_allocations::handler(ctx, new_allocations)
    }

    /// CPI request from a beam program to mint gSol.
    ///
    /// This checks for the signature of the account with the registered key, and
    /// verifies that the immediate calling program owns that account.
    pub fn mint_gsol(ctx: Context<MintGsol>, amount: u64) -> Result<()> {
        mint_gsol::handler(ctx, amount)
    }

    /// CPI request from a beam program to burn gSol.
    ///
    /// Same invariants as for [minting][sunrise_core::mint_gsol()].
    pub fn burn_gsol(ctx: Context<BurnGsol>, amount: u64) -> Result<()> {
        burn_gsol::handler(ctx, amount)
    }

    /// Removes a beam from the state.
    ///
    /// Errors if the beam's allocation is not set to zero.
    pub fn remove_beam(ctx: Context<RemoveBeam>, beam: Pubkey) -> Result<()> {
        remove_beam::handler(ctx, beam)
    }

    /// Exports the gsol mint authority to a new account.
    pub fn export_mint_authority(ctx: Context<ExportMintAuthority>) -> Result<()> {
        export_mint_authority::handler(ctx)
    }

    /// Updates the Epoch Report Account, which stores the amount of yield extracted or extractable over time
    pub fn update_epoch_report<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, UpdateEpochReport>,
    ) -> Result<()> {
        update_epoch_report::handler(ctx)
    }

    /// CPI request from a beam program to extract yield from Sunrise
    pub fn extract_yield(ctx: Context<ExtractYield>, amount_in_lamports: u64) -> Result<()> {
        extract_yield::handler(ctx, amount_in_lamports)
    }
}

#[derive(Accounts)]
#[instruction(input: RegisterStateInput)]
pub struct RegisterState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = State::size(input.initial_capacity as usize),
    )]
    pub state: Account<'info, State>,

    #[account(
        init,
        payer = payer,
        space = EpochReport::SIZE,
        seeds = [
            state.key().as_ref(),
            EPOCH_REPORT
        ],
        bump
    )]
    pub epoch_report: Account<'info, EpochReport>,

    pub gsol_mint: Account<'info, Mint>,

    /// CHECK: Valid PDA seeds.
    #[account(
        seeds = [
            state.key().as_ref(),
            GSOL_AUTHORITY
        ],
        bump
    )]
    pub gsol_mint_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RegisterBeam<'info> {
    #[account(
        mut,
        has_one = update_authority
    )]
    pub state: Account<'info, State>,

    pub update_authority: Signer<'info>,

    /// CHECK: The beam's expected signer and identifier.
    pub beam_account: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdateBeamAllocations<'info> {
    #[account(
        mut,
        has_one = update_authority
    )]
    pub state: Account<'info, State>,

    pub update_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveBeam<'info> {
    #[account(
        mut,
        has_one = update_authority
    )]
    pub state: Account<'info, State>,

    pub update_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BurnGsol<'info> {
    #[account(
        mut,
        has_one = gsol_mint,
    )]
    pub state: Account<'info, State>,

    pub beam: Signer<'info>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,

    pub burn_gsol_from_owner: Signer<'info>,
    #[account(
        mut,
        token::mint = gsol_mint,
        token::authority = burn_gsol_from_owner
    )]
    pub burn_gsol_from: Account<'info, TokenAccount>,

    /// CHECK: Verified Instructions Sysvar.
    #[account(address = sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(amount_in_lamports: u64)]
pub struct MintGsol<'info> {
    #[account(
        mut,
        has_one = gsol_mint,
    )]
    pub state: Box<Account<'info, State>>,

    pub beam: Signer<'info>,

    #[account(mut)]
    pub gsol_mint: Box<Account<'info, Mint>>,

    #[account(
        seeds = [
            state.key().as_ref(),
            GSOL_AUTHORITY
        ],
        bump = state.gsol_mint_authority_bump
    )]
    pub gsol_mint_authority: SystemAccount<'info>,

    #[account(mut, token::mint = gsol_mint)]
    pub mint_gsol_to: Box<Account<'info, TokenAccount>>,

    /// CHECK: Verified Instructions Sysvar.
    #[account(address = sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateState<'info> {
    #[account(
        mut,
        has_one = update_authority
    )]
    pub state: Account<'info, State>,

    pub update_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExportMintAuthority<'info> {
    pub update_authority: Signer<'info>,

    #[account(
        has_one = gsol_mint,
        has_one = update_authority
    )]
    pub state: Account<'info, State>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,

    #[account(
        seeds = [
            state.key().as_ref(),
            GSOL_AUTHORITY
        ],
        bump = state.gsol_mint_authority_bump
    )]
    pub gsol_mint_authority: SystemAccount<'info>,

    /// CHECK: The new gsol mint authority
    pub new_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResizeAllocations<'info> {
    pub update_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, has_one = update_authority)]
    pub state: Account<'info, State>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateEpochReport<'info> {
    #[account(
        has_one = gsol_mint,
    )]
    pub state: Box<Account<'info, State>>,

    #[account(
        mut,
        seeds = [
            state.key().as_ref(),
            EPOCH_REPORT
        ],
        bump = state.epoch_report_bump
    )]
    pub epoch_report: Account<'info, EpochReport>,

    pub gsol_mint: Box<Account<'info, Mint>>,

    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(amount_in_lamports: u64)]
pub struct ExtractYield<'info> {
    pub state: Box<Account<'info, State>>,

    /// The beam contributing the extracted yield.
    /// This is verified in the handler to be a beam attached to this state.
    pub beam: Signer<'info>,

    /// The epoch report account. This is updated with the latest extracted yield value.
    /// It must be up to date with the current epoch. If not, run updateEpochReport before it.
    #[account(
    mut,
    seeds = [
        state.key().as_ref(),
        EPOCH_REPORT
    ],
    bump = state.epoch_report_bump
    )]
    pub epoch_report: Account<'info, EpochReport>,

    pub sysvar_clock: Sysvar<'info, Clock>,

    /// CHECK: Verified Instructions Sysvar.
    #[account(address = sysvar::instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,
}

#[error_code]
pub enum BeamError {
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

    /// Thrown on an attempt to register a beam that's already present.
    #[msg("Tried to register an already-registered beam")]
    DuplicateBeamEntry,

    /// Thrown if there's no available space for adding a new beam.
    #[msg("No space in allocations for new entry")]
    NoSpaceInAllocations,

    /// Thrown if an action requires a beam be present, but it isn't.
    #[msg("Not a valid beam that this program recognizes")]
    UnidentifiedBeam,

    /// Thrown the program directly making the CPI isn't the beam program.
    #[msg("Cpi isn't directly being made by beam program")]
    UnidentifiedCallingProgram,

    /// Thrown on an attempt to remove a beam with a non-zero allocation.
    #[msg("Can't remove a beam with a non-zero allocation")]
    NonZeroAllocation,

    /// Thrown if the epoch report is updated with an incorrect amount of beam epoch reports
    #[msg("Incorrect amount of beam epoch reports")]
    IncorrectBeamEpochReportCount,

    /// Thrown if the epoch report is updated with beam epoch reports from the wrong epoch
    #[msg("Incorrect epoch for beam epoch reports")]
    IncorrectBeamEpochReportEpoch,

    /// Thrown if the epoch report is updated by an incorrect beam epoch report
    #[msg("Incorrect beam epoch report")]
    IncorrectBeamEpochReport,

    /// Thrown if the epoch report is already updated for this epoch
    #[msg("Epoch report already updated")]
    EpochReportAlreadyUpdated,

    /// Thrown when attempting to extract yield but the epoch report is not up to date
    #[msg("Epoch report not up to date")]
    EpochReportNotUpToDate,

    /// Overflow error
    #[msg("Overflow")]
    Overflow,
}
