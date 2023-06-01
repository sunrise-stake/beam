use anchor_lang::prelude::*;
use crate::{state::State, BeamError};

/// Verifies that a mint request is valid by:
/// - Checking that the beam is present in the state.
/// - Checking that the executing program owns the beam.
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