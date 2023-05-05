#![allow(clippy::result_large_err)]
#![allow(unreachable_code)]

mod instructions;
mod seeds;
mod state;
mod token;
mod utils;

use anchor_lang::prelude::*;
use instructions::*;
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

pub fn check_beam_parameters(
    state: &ControllerState,
    beam: &AccountInfo,
    cpi_program_id: &Pubkey,
) -> Result<()> {
    if !state.contains_beam(beam.key) {
        return Err(BeamProgramError::BeamNotPresent.into());
    }
    if beam.owner != cpi_program_id {
        return Err(BeamProgramError::UnexpectedCallingProgram.into());
    }

    Ok(())
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
