use crate::state::AllocationUpdate;
use crate::{BeamError, UpdateBeamAllocations};
use anchor_lang::prelude::*;

pub fn handler(
    ctx: Context<UpdateBeamAllocations>,
    new_allocations: Vec<AllocationUpdate>,
) -> Result<()> {
    let state = &mut ctx.accounts.state;

    for update in new_allocations {
        // Find the matching beam-details struct by its key and replace it.
        if let Some(details) = state.get_mut_beam_details(&update.beam) {
            details.allocation = update.new_allocation;
        } else {
            return Err(BeamError::UnidentifiedBeam.into());
        }
    }

    // Ensure that the allocations are sane.
    let sum: u8 = state.allocations.iter().map(|a| a.allocation).sum();
    require_eq!(sum, 100);

    Ok(())
}
