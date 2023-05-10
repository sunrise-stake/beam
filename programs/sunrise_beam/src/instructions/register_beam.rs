use crate::{state::RegisterBeamInput, BeamProgramError, RegisterBeam};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<RegisterBeam>, input: RegisterBeamInput) -> Result<()> {
    let state = &mut ctx.accounts.state;

    // TODO: Reallocate space here instead of erroring?.
    if state.push_allocation(input.into())?.is_none() {
        return Err(BeamProgramError::WouldExceedBeamCapacity.into());
    }

    Ok(())
}
