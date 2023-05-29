use anchor_lang::prelude::*;
use crate::{state::BeamDetails, system, RegisterBeam};

pub fn handler(ctx: Context<RegisterBeam>, beam_key: Pubkey) -> Result<()> {
    let state = &mut ctx.accounts.state;

    if state.add_beam(BeamDetails::new(beam_key, 0))?.is_none() {
        system::resize_state(state, &ctx.accounts.payer, &ctx.accounts.system_program)?;
    }

    Ok(())
}
