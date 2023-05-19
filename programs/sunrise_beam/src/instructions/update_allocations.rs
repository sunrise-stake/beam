use anchor_lang::prelude::*;

use crate::state::AllocationUpdate;
use crate::UpdateBeamAllocations;

pub fn handler(ctx: Context<UpdateBeamAllocations>, values: Vec<AllocationUpdate>) -> Result<()> {
    let state = &mut ctx.accounts.state;

    for value in values {
        if let Some(details) = state.get_mut_beam_details(&value.beam) {
            details.allocation = value.new_allocation;
        } else {
            todo!("maybe error?");
        }
    }

    let mut sum: u8 = 0;
    state.allocations.iter().for_each(|a| sum += a.allocation);
    require_eq!(sum, 100);

    Ok(())
}
