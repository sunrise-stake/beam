use anchor_lang::prelude::*;

use crate::system::resize_state;
use crate::{state::BeamDetails, RegisterBeam};

pub fn handler(ctx: Context<RegisterBeam>, beam_key: Pubkey) -> Result<()> {
    let state = &mut ctx.accounts.state;

    if state
        .push_allocation(BeamDetails::new(beam_key, 0))?
        .is_none()
    {
        resize_state(state, &ctx.accounts.payer, &ctx.accounts.system_program)?;
    }

    Ok(())
}
