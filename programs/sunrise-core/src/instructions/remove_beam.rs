use crate::RemoveBeam;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<RemoveBeam>, beam: Pubkey) -> Result<()> {
    ctx.accounts.state.remove_beam(&beam)?;

    Ok(())
}
