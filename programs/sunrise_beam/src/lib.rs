#![allow(clippy::result_large_err)]

mod instructions;
mod seeds;
mod state;
mod token;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sunrise_beam {
    use super::*;

    pub fn register_state(ctx: Context<RegisterState>, input: StateInput) -> Result<()> {
        register_state_handler(ctx, input)
    }

    pub fn add_beam(ctx: Context<AddBeam>, input: BeamInput) -> Result<()> {
        add_beam_handler(ctx, input)
    }

    pub fn freeze_beam(ctx: Context<FreezeBeam>) -> Result<()> {
        freeze_beam_handler(ctx)
    }

    pub fn mint_gsol(ctx: Context<MintGsol>, amount: u64) -> Result<()> {
        mint_gsol_handler(ctx, amount)
    }

    pub fn burn_gsol(ctx: Context<BurnGsol>, amount: u64) -> Result<()> {
        burn_gsol_handler(ctx, amount)
    }
}

#[error_code]
pub enum SunriseError {
    #[msg("Can't operate on a frozen beam")]
    FrozenBeam,
}
