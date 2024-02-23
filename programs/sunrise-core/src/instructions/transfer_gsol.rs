use crate::{system, utils, BeamError, TransferGsol};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<TransferGsol>, recipient_beam: Pubkey, amount_in_lamports: u64) -> Result<()> {
    let amount = amount_in_lamports;
    let state = &mut ctx.accounts.state;

    // Check that the requesting program is valid.
    let cpi_program =
        utils::get_cpi_program_id(&ctx.accounts.sysvar_instructions.to_account_info())?;
    system::checked_find_beam_idx(state, &ctx.accounts.beam, &cpi_program)?;

    let source_beam_details = state
        .get_mut_beam_details(&ctx.accounts.beam.key())
        .ok_or(BeamError::UnidentifiedBeam)?;

    // Can't transfer more gsol than this beam is responsible for.
    if source_beam_details.partial_gsol_supply < amount {
        msg!(
            "Beam supply {}, requested burn {}",
            source_beam_details.partial_gsol_supply,
            amount
        );
        return Err(BeamError::BurnWindowExceeded.into());
    }
    source_beam_details.partial_gsol_supply = source_beam_details.partial_gsol_supply.checked_sub(amount).unwrap();

    let target_beam_details = state
        .get_mut_beam_details(&recipient_beam)
        .ok_or(BeamError::UnidentifiedBeam)?;
    target_beam_details.partial_gsol_supply = target_beam_details.partial_gsol_supply.checked_add(amount).unwrap();

    Ok(())
}
