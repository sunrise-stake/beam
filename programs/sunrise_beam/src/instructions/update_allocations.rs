use crate::{state::Allocation, UpdateBeamAllocations};
use anchor_lang::prelude::*;
use std::collections::HashSet;

pub fn handler(ctx: Context<UpdateBeamAllocations>, values: Vec<Allocation>) -> Result<()> {
    let values: Vec<Allocation> = values
        .into_iter()
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();
    let mut final_keys: Vec<Pubkey> = values.iter().map(|value| value.beam).collect();

    let state = &mut ctx.accounts.state;
    let mut initial_keys: Vec<Pubkey> = state
        .allocations
        .iter()
        .filter_map(|alloc| {
            if alloc.beam != Pubkey::default() {
                Some(alloc.beam)
            } else {
                None
            }
        })
        .collect();

    require_eq!(initial_keys.len(), final_keys.len());

    initial_keys.sort();
    final_keys.sort();
    for _ in 0..final_keys.len() {
        require_keys_eq!(final_keys[0], initial_keys[0]);
    }

    state.allocations = values;
    Ok(())
}
