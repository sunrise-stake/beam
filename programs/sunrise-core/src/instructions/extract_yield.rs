use anchor_lang::prelude::*;

use crate::{system, utils, BeamError, ExtractYield};

/// CPI request from a beam program to extract yield from Sunrise
/// This can only be invoked by a valid beam.
/// It does not send funds to the yield account (that is done by the beam program itself)
/// It only updates the extracted yield on the epoch report.
pub fn handler(ctx: Context<ExtractYield>, amount_in_lamports: u64) -> Result<()> {
    let state = &ctx.accounts.state;
    let epoch_report = &mut ctx.accounts.epoch_report;
    let current_epoch = ctx.accounts.clock.epoch;

    // Check that the executing program is valid.
    let cpi_program =
        utils::get_cpi_program_id(&ctx.accounts.instructions_sysvar.to_account_info())?;
    system::check_beam_validity(state, &ctx.accounts.beam, &cpi_program)?;

    // The epoch report must be already updated for this epoch
    require!(
        epoch_report.epoch == current_epoch,
        BeamError::EpochReportNotUpToDate
    );

    // Update the extracted yield on the report
    epoch_report
        .extracted_yield
        .checked_add(amount_in_lamports)
        .ok_or(BeamError::Overflow)?;

    Ok(())
}
