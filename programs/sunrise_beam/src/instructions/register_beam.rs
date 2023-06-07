use anchor_lang::prelude::*;
use crate::{state::BeamDetails, RegisterBeam};

pub fn handler(ctx: Context<RegisterBeam>) -> Result<()> {
    let state = &mut ctx.accounts.state;
    let beam_key = ctx.accounts.beam_account.key();

    state.add_beam(BeamDetails::new(beam_key, 0))?;

    Ok(())
}
