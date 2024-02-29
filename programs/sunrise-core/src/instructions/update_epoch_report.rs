use anchor_lang::prelude::*;

use crate::{system, utils, UpdateEpochReport};

/// Called by a beam via CPI - to update its epoch report.
/// Once all beams have called in via CPI, then the epoch report is considered updated for the given epoch
/// However, a beam is allowed to call in multiple times to update its epoch report for a given epoch.
pub fn handler<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, UpdateEpochReport>,
    extractable_yield: u64,
) -> Result<()> {
    let state = &mut ctx.accounts.state;
    let current_epoch = Clock::get().unwrap().epoch;

    // Check that the executing program is valid.
    let cpi_program =
        utils::get_cpi_program_id(&ctx.accounts.sysvar_instructions.to_account_info())?;
    let beam_idx = system::checked_find_beam_idx(state, &ctx.accounts.beam, &cpi_program)?;

    msg!(
        "Updating extractable yield for beam {} to {}",
        beam_idx,
        extractable_yield
    );

    // Update the epoch report with the current extractable yield
    state
        .epoch_report
        .update_extractable_yield_and_epoch_for_beam(beam_idx, current_epoch, extractable_yield);

    // Update the current gsol supply
    state.epoch_report.current_gsol_supply = ctx.accounts.gsol_mint.supply;

    Ok(())
}
