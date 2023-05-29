use anchor_lang::prelude::*;
use crate::{BeamError, RemoveBeam};

pub fn handler(ctx: Context<RemoveBeam>, beam: Pubkey) -> Result<()> {
    if ctx.accounts.state.remove_beam(&beam).is_none() {
        return Err(BeamError::UnidentifiedBeam.into());
    }

    Ok(())
}
