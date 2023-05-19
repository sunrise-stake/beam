use crate::{
    state::{BeamDetails, State},
    utils::resize_account,
    BeamError,
};
use anchor_lang::prelude::*;

pub fn resize_state<'a>(
    state: &mut Account<'a, State>,
    payer: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
) -> Result<()> {
    let window = state.alloc_window;
    if window == 0 {
        return Err(BeamError::WouldExceedBeamCapacity.into());
    }

    let new_length = state
        .allocations
        .len()
        .checked_add(window as usize)
        .unwrap();
    let new_size = State::size(new_length);

    resize_account(&state.to_account_info(), payer, system_program, new_size)?;
    state
        .allocations
        .extend(std::iter::repeat(BeamDetails::default()));

    Ok(())
}

pub fn check_beam_validity(
    state: &Account<'_, State>,
    beam: &AccountInfo,
    cpi_program_id: &Pubkey,
) -> Result<()> {
    if state.contains_beam(beam.key) {
        return Err(BeamError::UnidentifiedBeam.into());
    }
    if beam.owner != cpi_program_id {
        return Err(BeamError::UnidentifiedCallingProgram.into());
    }

    Ok(())
}
