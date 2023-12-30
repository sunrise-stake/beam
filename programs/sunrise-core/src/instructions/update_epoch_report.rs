use anchor_lang::prelude::*;

use crate::{BeamError, EpochReport, UpdateEpochReport};

pub fn handler<'c: 'info, 'info>(ctx: Context<'_, '_, 'c, 'info, UpdateEpochReport>) -> Result<()> {
    let state = &ctx.accounts.state;
    let epoch_report = &mut ctx.accounts.epoch_report;
    let current_epoch = ctx.accounts.clock.epoch;

    // The epoch report must not be already updated for this epoch
    require!(
        epoch_report.epoch < current_epoch,
        BeamError::EpochReportAlreadyUpdated
    );

    // Remaining accounts must all be beam-owned Epoch Report accounts.
    // The count must equal the number of beams in the state.
    let beam_count = state.beam_count();
    let beam_owned_epoch_report_count = ctx.remaining_accounts.len();
    require!(
        beam_count == beam_owned_epoch_report_count,
        BeamError::IncorrectBeamEpochReportCount
    );

    // Iterate through the remaining accounts, convert them to Epoch Reports
    for (index, beam_owned_epoch_report_account) in ctx.remaining_accounts.iter().enumerate() {
        // The epoch of each beam-owned epoch report must match the current epoch
        let beam_owned_epoch_report: Account<EpochReport> =
            Account::try_from(beam_owned_epoch_report_account)?;
        require!(
            beam_owned_epoch_report.epoch == current_epoch,
            BeamError::IncorrectBeamEpochReportEpoch
        );

        // Check that they are the expected beam account
        require_keys_eq!(
            *beam_owned_epoch_report_account.key,
            state.allocations[index].key,
            BeamError::IncorrectBeamEpochReport
        );

        // Add the totals to the epoch report
        epoch_report
            .extractable_yield
            .checked_add(beam_owned_epoch_report.extractable_yield)
            .ok_or(BeamError::Overflow)?;
    }

    // Update the epoch to the current one
    epoch_report.epoch = current_epoch;
    // Set the current gsol supply
    epoch_report.current_gsol_supply = ctx.accounts.gsol_mint.supply;

    Ok(())
}
