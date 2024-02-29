use anchor_lang::prelude::*;

use crate::{system, utils, BeamError, ExtractYield};

/// CPI request from a beam program to extract yield from Sunrise
/// This can only be invoked by a valid beam.
/// It does not send funds to the yield account (that is done by the beam program itself)
/// It only updates the extracted yield on the epoch report.
pub fn handler(ctx: Context<ExtractYield>, amount_in_lamports: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;
    let current_epoch = Clock::get()?.epoch;

    // Check that the executing program is valid.
    let cpi_program =
        utils::get_cpi_program_id(&ctx.accounts.sysvar_instructions.to_account_info())?;
    let beam_idx = system::checked_find_beam_idx(state, &ctx.accounts.beam, &cpi_program)?;
    let beam_epoch_details = &state.epoch_report.beam_epoch_details[beam_idx];

    // The epoch report must be already updated for this epoch and beam
    require!(
        beam_epoch_details.epoch == current_epoch,
        BeamError::EpochReportNotUpToDate
    );

    msg!(
        "Registering extracted yield of {} lamports for beam {}",
        amount_in_lamports,
        beam_idx
    );

    // Update the extracted yield on the epoch report for the beam,
    // if the epoch report has already been updated for this epoch and beam (TODO is this check strictly necessary?)
    state
        .epoch_report
        .extract_yield_for_beam(beam_idx, amount_in_lamports, current_epoch)?;

    Ok(())
}
