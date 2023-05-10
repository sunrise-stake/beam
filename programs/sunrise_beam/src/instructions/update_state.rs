use crate::{state::*, UpdateState};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<UpdateState>, input: UpdateStateInput) -> Result<()> {
    ctx.accounts.state.update(input);
    Ok(())
}
