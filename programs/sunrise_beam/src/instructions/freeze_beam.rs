use crate::state::{BeamApprovalState, State};
use crate::SunriseError::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct FreezeBeam<'info> {
    #[account(mut, has_one = update_authority)]
    pub state: Box<Account<'info, State>>,

    pub update_authority: Signer<'info>,

    #[account(
        mut,
        has_one = state,
        constraint = !beam_state.frozen @ FrozenBeam,
    )]
    pub beam_state: Box<Account<'info, BeamApprovalState>>,
}

#[allow(dead_code)]
pub fn freeze_beam_handler(ctx: Context<FreezeBeam>) -> Result<()> {
    let beam_state = &mut ctx.accounts.beam_state;
    beam_state.frozen = true;

    Ok(())
}
