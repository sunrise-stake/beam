use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateState<'info> {
    #[account(mut,has_one=update_authority)]
    pub state: Account<'info, ControllerState>,
    pub update_authority: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateState>, input: UpdateStateInput) -> Result<()> {
    ctx.accounts.state.update(input);
    Ok(())
}
