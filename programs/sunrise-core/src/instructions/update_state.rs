use anchor_lang::prelude::*;

use crate::state::*;
use crate::UpdateState;

pub fn handler(ctx: Context<UpdateState>, input: UpdateStateInput) -> Result<()> {
    ctx.accounts.state.update(input);
    Ok(())
}
