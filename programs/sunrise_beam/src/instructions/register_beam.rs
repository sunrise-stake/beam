use crate::{state::BeamDetails, RegisterBeam};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<RegisterBeam>, beam_key: Pubkey) -> Result<()> {
    let state = &mut ctx.accounts.state;
    
    state.add_beam(BeamDetails::new(beam_key, 0))?;

    Ok(())
}
