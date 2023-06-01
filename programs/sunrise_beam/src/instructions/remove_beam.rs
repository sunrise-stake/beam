use anchor_lang::prelude::*;
use crate::RemoveBeam;

pub fn handler(ctx: Context<RemoveBeam>, beam: Pubkey) -> Result<()> {
    ctx.accounts.state.remove_beam(&beam)
}
