use crate::{BeamProgramError, RemoveBeam};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<RemoveBeam>, beam: Pubkey) -> Result<()> {
    if ctx.accounts.state.remove_beam(&beam).is_none() {
        return Err(BeamProgramError::BeamNotPresent.into());
    }

    Ok(())
}
