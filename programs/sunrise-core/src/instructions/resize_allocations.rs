use crate::{
    state::{BeamDetails, State},
    utils::resize_account,
    ResizeAllocations,
};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<ResizeAllocations>, to_add: usize) -> Result<()> {
    let state = &mut ctx.accounts.state;

    let new_size = calculate_new_size(state, to_add);

    resize_account(
        &state.to_account_info(),
        &ctx.accounts.payer.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        new_size,
    )?;

    // Extend allocations with default beam-details objects.
    state
        .allocations
        .extend(std::iter::repeat(BeamDetails::default()).take(to_add));

    Ok(())
}

fn calculate_new_size(state: &State, additional_beams: usize) -> usize {
    // Calculate the expected new length of the allocations `vec`.
    let current_len = state.allocations.len();
    let new_len = current_len.checked_add(additional_beams).unwrap();

    // Calculate the corresponding size for that length.
    State::size(new_len)
}

#[cfg(test)]
pub mod resize_checks {
    use super::*;

    #[test]
    fn test_calculate_new_size() {
        let mut state = State::default();
        state.allocations = vec![BeamDetails::default(); 10];
        assert_eq!(calculate_new_size(&state, 10), State::size(20));
    }
    #[test]
    fn test_extend() {
        let mut state = State::default();
        state.allocations = Vec::with_capacity(3);
        state.allocations.push(BeamDetails::default());
        assert_eq!(state.allocations.len(), 1);
        assert_eq!(state.allocations, vec![BeamDetails::default()]);
        state
            .allocations
            .extend(std::iter::repeat(BeamDetails::default()).take(2));
        assert_eq!(state.allocations.len(), 3);
        assert_eq!(state.allocations, vec![BeamDetails::default(); 3]);
    }
}
