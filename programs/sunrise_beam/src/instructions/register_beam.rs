use crate::state::{ControllerState, RegisterBeamInput};
use crate::BeamProgramError;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(input: RegisterBeamInput)]
pub struct RegisterBeam<'info> {
    #[account(mut, has_one = update_authority)]
    pub state: Account<'info, ControllerState>,
    #[account(mut)] // might have to pay for a resize
    pub payer: Signer<'info>,
    pub update_authority: Signer<'info>,
    /// CHECK: The beam being registered is a valid account.
    #[account(constraint = beam_state.key() == input.beam)]
    pub beam_state: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterBeam>, input: RegisterBeamInput) -> Result<()> {
    let state = &mut ctx.accounts.state;

    // TODO: Reallocate space here instead of erroring?.
    if state.push_allocation(input.into())?.is_none() {
        return Err(BeamProgramError::WouldExceedBeamCapacity.into());
    }

    Ok(())
}
