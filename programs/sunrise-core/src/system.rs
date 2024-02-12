use crate::{state::State, BeamError};
use anchor_lang::prelude::{Account, AccountInfo, Pubkey};

/// Verifies that a mint request is valid by:
/// - Checking that the beam is present in the state.
/// - Checking that the executing program owns the beam.
pub fn checked_find_beam_idx(
    state: &Account<'_, State>,
    beam: &AccountInfo,
    cpi_program_id: &Pubkey,
) -> Result<usize, BeamError> {
    if beam.owner != cpi_program_id {
        return Err(BeamError::UnidentifiedCallingProgram);
    }

    let index = state.find_beam_index(beam.key);
    index.ok_or(BeamError::UnidentifiedBeam)
}
