use crate::{state::Allocation, RegisterBeam};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<RegisterBeam>, beam_key: Pubkey) -> Result<()> {
    let state = &mut ctx.accounts.state;

    if state
        .push_allocation(Allocation::new(beam_key, 0))?
        .is_none()
    {
        let state_info = state.to_account_info();
        state.resize(
            &state_info,
            &ctx.accounts.payer,
            &ctx.accounts.system_program,
        )?;
    }

    Ok(())
}
