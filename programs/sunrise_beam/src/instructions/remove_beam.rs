use crate::{BeamError, RemoveBeam};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<RemoveBeam>, beam: Pubkey) -> Result<()> {
    if ctx.accounts.state.remove_beam(&beam).is_none() {
        return Err(BeamError::BeamNotPresent.into());
    }

    Ok(())
}
