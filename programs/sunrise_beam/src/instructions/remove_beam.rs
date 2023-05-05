use crate::state::*;
use crate::BeamProgramError;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RemoveBeam<'info> {
    #[account(mut, has_one = update_authority)]
    pub state: Account<'info, ControllerState>,
    pub update_authority: Signer<'info>,
}

pub fn handler(ctx: Context<RemoveBeam>, beam: Pubkey) -> Result<()> {
    if ctx.accounts.state.remove_beam(&beam).is_none() {
        return Err(BeamProgramError::BeamNotPresent.into());
    }

    Ok(())
}
