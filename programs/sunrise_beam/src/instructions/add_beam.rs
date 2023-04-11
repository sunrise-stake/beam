use crate::state::{BeamApprovalState, BeamInput, State};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AddBeam<'info> {
    #[account(mut, has_one = update_authority)]
    pub state: Account<'info, State>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub update_authority: Signer<'info>,

    #[account(
        init,
        seeds = [
            state.key().as_ref(),
            state.beams.checked_add(1).unwrap().to_le_bytes().as_ref(),
        ],
        bump,
        payer = payer,
        space = 8 + BeamApprovalState::SPACE,
    )]
    pub beam_state: Account<'info, BeamApprovalState>,

    pub system_program: Program<'info, System>,
}

pub fn add_beam_handler(ctx: Context<AddBeam>, input: BeamInput) -> Result<()> {
    let beam_state = &mut ctx.accounts.beam_state;
    let state = &mut ctx.accounts.state;

    beam_state.state = state.key();
    beam_state.program_id = input.program_id;
    beam_state.min_allocation = input.min_allocation;
    beam_state.max_allocation = input.max_allocation;
    beam_state.beam_authority = input.beam_authority;
    beam_state.frozen = false;

    let updated_beam_count = state.beams.checked_add(1).unwrap();

    beam_state.id = updated_beam_count;
    state.beams = updated_beam_count;

    Ok(())
}
