use crate::{state::AllocationUpdate, UpdateBeamAllocations};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<UpdateBeamAllocations>, values: Vec<AllocationUpdate>) -> Result<()> {
    let state = &mut ctx.accounts.state;

    for value in values {
        if let Some(found) = state.get_mut_allocation(&value.beam) {
            found.allocation = value.new_allocation;
        } else {
            todo!("maybe error?");
        }
    }

    let mut sum: u8 = 0;
    state.allocations.iter().for_each(|a| sum += a.allocation);
    require_eq!(sum, 100);

    Ok(())
}
